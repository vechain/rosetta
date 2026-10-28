import axios from 'axios';
import { Transaction, secp256k1 } from 'thor-devkit';
import { SOLO_ACCOUNTS, THOR_URL, VTHO, VTHO_CONTRACT_ADDRESS, randomAddress } from '../config';
import { TransferIntent, constructTransfer, sendTransfer, submitTransaction, waitForPacked } from '../utils/construction';
import { comparable, expectedOperations } from '../utils/expected';
import { rosetta } from '../utils/rosettaClient';
import { thor } from '../utils/thorClient';

const [sender, delegator] = SOLO_ACCOUNTS;

interface Op {
    type: string,
    account: { address: string },
    amount: { value: string, currency: { symbol: string } }
}

describe('Mempool API vs thor', () => {
    // A submitted transaction stays in the pool until the next solo block,
    // so these checks run right after submission.
    it.each([
        ['dynamic', 'dynamic' as const],
        ['legacy', 'legacy' as const]
    ])('a just-submitted %s transaction is listed like thor /node/txpool', async (_, transactionType) => {
        const intent: TransferIntent = { from: sender, to: randomAddress(), amount: '1000', transactionType };
        const constructed = await constructTransfer(intent);
        const hash = await submitTransaction(constructed.combine.signed_transaction);

        const [mempool, txpool, mempoolTx] = await Promise.all([
            rosetta.call('/mempool'),
            thor.txpool(),
            rosetta.call('/mempool/transaction', { transaction_identifier: { hash } })
        ]);

        expect(txpool).toContain(hash);
        expect(mempool.transaction_identifiers).toContainEqual({ hash });
        expect(mempoolTx.transaction.transaction_identifier.hash).toBe(hash);

        const transfers = (mempoolTx.transaction.operations as Op[])
            .filter(op => op.type === 'Transfer')
            .map(op => ({ address: op.account.address, value: op.amount.value }));
        expect(transfers).toEqual(expect.arrayContaining((constructed.operations as Op[]).map(op => ({ address: op.account.address, value: op.amount.value }))));
    });

    it('the fee operation of a pending transaction equals gas × gas price', async () => {
        const constructed = await constructTransfer({ from: sender, to: randomAddress(), amount: '1000' });
        const hash = await submitTransaction(constructed.combine.signed_transaction);
        const mempoolTx = await rosetta.call('/mempool/transaction', { transaction_identifier: { hash } });
        const fee = (mempoolTx.transaction.operations as Op[]).find(op => op.type === 'Fee')!;
        const { gas, maxFeePerGas } = constructed.metadata.metadata;
        expect(BigInt(fee.amount.value)).toBe(-BigInt(gas) * BigInt(maxFeePerGas));
    });

    it('a pending VTHO call with malformed transfer arguments is reported as a contract call', async () => {
        const [genesis, best] = await Promise.all([thor.block(0), thor.best()]);
        const tx = new Transaction({
            chainTag: parseInt(genesis.id.slice(-2), 16),
            blockRef: best.id.slice(0, 18),
            expiration: 32,
            clauses: [{ to: VTHO_CONTRACT_ADDRESS, value: 0, data: '0xa9059cbb' }],
            gasPriceCoef: 0,
            gas: 50000,
            dependsOn: null,
            nonce: Date.now()
        });
        tx.signature = secp256k1.sign(tx.signingHash(), Buffer.from(sender.privateKey, 'hex'));
        const { id: hash } = (await axios.post(`${THOR_URL}/transactions`, { raw: '0x' + tx.encode().toString('hex') })).data;

        const mempoolTx = await rosetta.call('/mempool/transaction', { transaction_identifier: { hash } });
        expect((mempoolTx.transaction.operations as Op[]).map(op => op.type)).toEqual(['Call', 'Fee']);
    });

    it.each([
        ['fee-delegated', delegator],
        ['self-delegated', sender]
    ])('a pending %s transaction charges the fee to the delegator', async (_, payer) => {
        const constructed = await constructTransfer({ from: sender, to: randomAddress(), amount: '1000', delegator: payer });
        const hash = await submitTransaction(constructed.combine.signed_transaction);
        const mempoolTx = await rosetta.call('/mempool/transaction', { transaction_identifier: { hash } });
        const feeOps = (mempoolTx.transaction.operations as Op[]).filter(op => op.type === 'Fee' || op.type === 'FeeDelegation');
        expect(feeOps.map(op => ({ type: op.type, address: op.account.address, symbol: op.amount.currency.symbol })))
            .toEqual([{ type: 'FeeDelegation', address: payer.address, symbol: 'VTHO' }]);
        const { gas, maxFeePerGas } = constructed.metadata.metadata;
        expect(BigInt(feeOps[0].amount.value)).toBe(-BigInt(gas) * BigInt(maxFeePerGas));
    });
});

describe('Search API vs thor', () => {
    const searchOperations = async (hash: string) => {
        const response = await rosetta.call('/search/transactions', { transaction_identifier: { hash } });
        const result = response.transactions[0];
        return { result, operations: result.transaction.operations };
    };

    it('locates the transaction in the block thor packed it in', async () => {
        const hash = await sendTransfer({ from: sender, to: randomAddress(), amount: '1000' });
        const receipt = await waitForPacked(hash);
        const { result } = await searchOperations(hash);
        expect(result.block_identifier).toEqual({ index: receipt.meta.blockNumber, hash: receipt.meta.blockID });
        expect(result.transaction.transaction_identifier).toEqual({ hash });
    });

    it('VET transfer operations match the thor receipt', async () => {
        const hash = await sendTransfer({ from: sender, to: randomAddress(), amount: '1000' });
        const receipt = await waitForPacked(hash);
        const { operations } = await searchOperations(hash);
        expect(comparable(operations)).toEqual(expectedOperations(receipt, (await thor.transaction(hash))!));
    });

    it('VTHO transfer operations match the thor receipt', async () => {
        const hash = await sendTransfer({ from: sender, to: randomAddress(), amount: '1000', currency: VTHO });
        const receipt = await waitForPacked(hash);
        const { operations } = await searchOperations(hash);
        expect(comparable(operations)).toEqual(expectedOperations(receipt, (await thor.transaction(hash))!));
    });

    it.each([
        ['fee-delegated', delegator],
        ['self-delegated', sender]
    ])('%s transfer operations match the thor receipt', async (_, payer) => {
        const hash = await sendTransfer({ from: sender, to: randomAddress(), amount: '1000', delegator: payer });
        const receipt = await waitForPacked(hash);
        expect(receipt.gasPayer).toBe(payer.address);
        const { operations } = await searchOperations(hash);
        expect(comparable(operations)).toEqual(expectedOperations(receipt, (await thor.transaction(hash))!));
    });
});
