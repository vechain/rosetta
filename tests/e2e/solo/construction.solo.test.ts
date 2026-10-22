import { ethers } from 'ethers';
import { blake2b256 } from 'thor-devkit';
import { SOLO_ACCOUNTS, VTHO, VTHO_CONTRACT_ADDRESS, networkIdentifier, randomAddress } from '../config';
import { ConstructedTransfer, SigningPayload, TransferIntent, constructTransfer, signPayload, submitTransaction } from '../utils/construction';
import { rosetta } from '../utils/rosettaClient';
import { ThorReceipt, ThorTransaction, thor } from '../utils/thorClient';

// Builds transactions through the Construction API, then checks every step
// against what thor actually accepts and packs.

const [sender, delegator] = SOLO_ACCOUNTS;
const erc20 = new ethers.Interface(['function transfer(address to, uint256 amount)']);

interface Case {
    intent: Omit<TransferIntent, 'from' | 'to'>,
    type: number
}

const cases: Array<[string, Case]> = [
    ['dynamic VET transfer', { intent: { amount: '1000' }, type: 81 }],
    ['legacy VET transfer', { intent: { amount: '1000', transactionType: 'legacy' }, type: 0 }],
    ['VTHO transfer', { intent: { amount: '1000', currency: VTHO }, type: 81 }],
    ['fee-delegated VET transfer', { intent: { amount: '1000', delegator }, type: 81 }],
    ['fee-delegated legacy VET transfer', { intent: { amount: '1000', transactionType: 'legacy', delegator }, type: 0 }],
    ['fee-delegated VTHO transfer', { intent: { amount: '1000', currency: VTHO, delegator }, type: 81 }],
    // VIP-191 allows the origin to be its own delegator; thor executes it as a delegated transaction.
    ['self-delegated VET transfer', { intent: { amount: '1000', delegator: sender }, type: 81 }]
];

const expectedClause = (to: string, intent: Case['intent']) =>
    intent.currency === VTHO
        ? { to: VTHO_CONTRACT_ADDRESS, value: '0', data: erc20.encodeFunctionData('transfer', [to, intent.amount]) }
        : { to, value: intent.amount, data: '0x' };

const normalizeClause = (clause: { to: string | null, value: string | number, data: string }) => ({
    to: clause.to?.toLowerCase() ?? null,
    value: BigInt(clause.value).toString(10),
    data: clause.data.toLowerCase()
});

describe('Construction API vs thor', () => {
    it('/construction/derive returns the address of the public key', async () => {
        for (const account of SOLO_ACCOUNTS) {
            const response = await rosetta.call('/construction/derive', {
                public_key: { hex_bytes: account.publicKey, curve_type: 'secp256k1' }
            });
            expect(response.address).toBe(account.address);
        }
    });

    // `signing_payload.address` is deprecated by `account_identifier` (Rosetta 1.4.4);
    // clients may send only the latter.
    it('/construction/combine identifies signers by account_identifier as well as by address', async () => {
        const constructed = await constructTransfer({ from: sender, to: randomAddress(), amount: '1', delegator });
        const signers = [sender, delegator];
        const signatures = constructed.payloads.payloads.map((payload, i) => {
            const { address, ...withoutAddress } = payload;
            return {
                signing_payload: { ...withoutAddress, account_identifier: { address } },
                public_key: { hex_bytes: signers[i].publicKey, curve_type: 'secp256k1' },
                signature_type: 'ecdsa_recovery',
                hex_bytes: signPayload(signers[i], payload)
            };
        });
        const response = await rosetta.call('/construction/combine', {
            unsigned_transaction: constructed.payloads.unsigned_transaction,
            signatures
        });
        expect(response.signed_transaction).toBe(constructed.combine.signed_transaction);
    });

    describe.each(cases)('%s', (_, { intent, type }) => {
        const recipient = randomAddress();
        const signers = [sender, ...(intent.delegator ? [intent.delegator] : [])];
        let constructed: ConstructedTransfer;
        let txId: string;
        let tx: ThorTransaction;
        let receipt: ThorReceipt;

        beforeAll(async () => {
            constructed = await constructTransfer({ from: sender, to: recipient, ...intent });
            txId = await submitTransaction(constructed.combine.signed_transaction);
            receipt = await thor.waitForReceipt(txId);
            tx = (await thor.transaction(txId))!;
        });

        it('preprocess builds the expected clause and requires every signer', () => {
            expect(constructed.preprocess.options.clauses.map(normalizeClause)).toEqual([normalizeClause(expectedClause(recipient, intent))]);
            expect(constructed.preprocess.required_public_keys).toEqual(signers.map(s => ({ address: s.address })));
        });

        it('metadata chainTag and blockRef refer to this chain', async () => {
            const { metadata } = constructed.metadata;
            const genesis = await thor.block(0);
            expect(metadata.chainTag).toBe(parseInt(genesis.id.slice(-2), 16));
            const refBlock = await thor.block(parseInt(metadata.blockRef.slice(2, 10), 16));
            expect(refBlock.id.startsWith(metadata.blockRef)).toBe(true);
        });

        if (type === 81) {
            it('metadata dynamic fee follows thor fee history', async () => {
                const { metadata, suggested_fee } = constructed.metadata;
                const history = await thor.feesHistory(50);
                const baseFee = BigInt(history.baseFeePerGas[0]);
                const reward = BigInt(history.reward?.[0][0] ?? '0');
                expect(BigInt(metadata.maxPriorityFeePerGas)).toBe(reward);
                expect(BigInt(metadata.maxFeePerGas)).toBe(baseFee + reward);
                expect(BigInt(suggested_fee[0].value)).toBe(-BigInt(metadata.gas) * BigInt(metadata.maxFeePerGas));
            });
        }

        // VIP-191: the origin signs the transaction signing hash, the delegator
        // signs blake2b256(signing hash || origin address).
        it('payloads ask the origin, then the delegator, to sign', () => {
            const { payloads } = constructed.payloads;
            expect(payloads.map(p => p.account_identifier?.address)).toEqual(signers.map(s => s.address));
            expect(payloads.map(p => p.address)).toEqual(signers.map(s => s.address));
            const delegationHash = blake2b256(Buffer.from(payloads[0].hex_bytes, 'hex'), Buffer.from(sender.address.slice(2), 'hex')).toString('hex');
            expect(payloads.map(p => p.hex_bytes)).toEqual([payloads[0].hex_bytes, ...(intent.delegator ? [delegationHash] : [])]);
        });

        const parsedFeeOps = () => [constructed.parsedUnsigned, constructed.parsedSigned].map(parsed =>
            parsed.operations.filter((op: { type: string }) => op.type === 'Fee' || op.type === 'FeeDelegation'));

        it('parse charges the fee to the account that pays gas', () => {
            const payer = intent.delegator ?? sender;
            const clauseCount = constructed.preprocess.options.clauses.length;
            for (const feeOps of parsedFeeOps()) {
                expect(feeOps).toHaveLength(1);
                expect(feeOps[0]).toMatchObject({
                    type: intent.delegator ? 'FeeDelegation' : 'Fee',
                    account: { address: payer.address },
                    amount: { currency: { symbol: 'VTHO' } },
                    // The delegation fee follows the clauses; the plain Fee index is not pinned here.
                    ...(intent.delegator ? { operation_identifier: { network_index: clauseCount } } : {})
                });
            }
        });

        it('parse returns the intent operations and signers', () => {
            const transfers = (ops: Array<{ type: string, account: { address: string }, amount: { value: string, currency: { symbol: string } } }>) =>
                ops.filter(op => op.type === 'Transfer').map(op => ({ address: op.account.address, value: op.amount.value, symbol: op.amount.currency.symbol }));
            const intended = (constructed.operations as Parameters<typeof transfers>[0]).map(op => ({ address: op.account.address, value: op.amount.value, symbol: op.amount.currency.symbol }));

            expect(transfers(constructed.parsedUnsigned.operations)).toEqual(intended);
            expect(transfers(constructed.parsedSigned.operations)).toEqual(intended);
            expect(constructed.parsedUnsigned.account_identifier_signers).toBeUndefined();
            // Rosetta requires distinct signers, so a self-delegated transaction lists the origin once.
            const distinctSigners = [...new Set(signers.map(s => s.address))];
            expect(constructed.parsedSigned.account_identifier_signers).toEqual(distinctSigners.map(address => ({ address })));
        });

        it('hash equals the id thor assigns to the submitted transaction', () => {
            expect(txId).toBe(constructed.hash);
            expect(tx.id).toBe(constructed.hash);
        });

        it('the packed transaction matches what was constructed', () => {
            const { metadata } = constructed.metadata;
            expect(tx.type).toBe(type);
            expect(tx.origin).toBe(sender.address);
            expect(tx.delegator).toBe(intent.delegator?.address ?? null);
            expect(tx.chainTag).toBe(metadata.chainTag);
            expect(tx.blockRef).toBe(metadata.blockRef);
            expect(tx.gas).toBe(metadata.gas);
            expect(tx.clauses.map(normalizeClause)).toEqual(constructed.preprocess.options.clauses.map(normalizeClause));

            const feeFields = (source: { maxFeePerGas?: string, maxPriorityFeePerGas?: string, gasPriceCoef?: number }) =>
                type === 81
                    ? { maxFeePerGas: BigInt(source.maxFeePerGas!), maxPriorityFeePerGas: BigInt(source.maxPriorityFeePerGas!) }
                    : { gasPriceCoef: source.gasPriceCoef };
            expect(feeFields(tx)).toEqual(feeFields(metadata));
        });

        it('the transaction succeeds within the estimated gas and the right account pays', () => {
            expect(receipt.reverted).toBe(false);
            expect(receipt.gasUsed).toBeLessThanOrEqual(tx.gas);
            expect(receipt.gasPayer).toBe((intent.delegator ?? sender).address);
        });
    });
});

describe('Construction API fee delegation edge cases', () => {
    const publicKey = (account: typeof sender) => ({ hex_bytes: account.publicKey, curve_type: 'secp256k1' });

    // Combining it anyway would yield a transaction thor rejects with "invalid signature length".
    it.each([
        ['fee-delegated', delegator],
        ['self-delegated', sender]
    ])('combine rejects a %s transaction without the delegator signature', async (_, payer) => {
        const constructed = await constructTransfer({ from: sender, to: randomAddress(), amount: '1', delegator: payer });
        const originPayload: SigningPayload = constructed.payloads.payloads[0];
        const response = await rosetta.postRaw<{ code: number }>('/construction/combine', {
            network_identifier: networkIdentifier,
            unsigned_transaction: constructed.payloads.unsigned_transaction,
            signatures: [{
                signing_payload: originPayload,
                public_key: publicKey(sender),
                signature_type: 'ecdsa_recovery',
                hex_bytes: signPayload(sender, originPayload)
            }]
        });
        expect(response.status).toBe(500);
        expect(response.data.code).toBe(20);
    });
});
