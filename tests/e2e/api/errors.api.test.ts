import { SOLO_ACCOUNTS, networkIdentifier, randomAddress } from '../config';
import { SigningPayload, constructTransfer, signPayload, transferOperations } from '../utils/construction';
import { rosetta } from '../utils/rosettaClient';
import * as schema from '../utils/schemas';

// Every error must be a Rosetta Error object, returned with HTTP 500, and
// declared in /network/options allow.errors.

const [sender, delegator, other] = SOLO_ACCOUNTS;
const unknownHash = '0x' + 'ab'.repeat(32);
const publicKey = { hex_bytes: sender.publicKey, curve_type: 'secp256k1' };
const delegatorPublicKey = { hex_bytes: delegator.publicKey, curve_type: 'secp256k1' };
const otherPublicKey = { hex_bytes: other.publicKey, curve_type: 'secp256k1' };

describe('Error responses', () => {
    let declaredCodes: number[];
    let signedTransaction: string;
    let unsignedTransaction: string;
    let signingPayload: SigningPayload;
    let signature: string;
    let delegatedMetadata: object;

    beforeAll(async () => {
        const options = await rosetta.call('/network/options');
        declaredCodes = options.allow.errors.map((e: { code: number }) => e.code);
        const constructed = await constructTransfer({ from: sender, to: randomAddress(), amount: '1' });
        signedTransaction = constructed.combine.signed_transaction;
        unsignedTransaction = constructed.payloads.unsigned_transaction;
        signingPayload = constructed.payloads.payloads[0];
        signature = signPayload(sender, signingPayload);
        delegatedMetadata = { ...constructed.metadata.metadata, fee_delegator_account: delegator.address };
    });

    const delegatedPayloads = (publicKeys: object[]) => () => ({
        network_identifier: networkIdentifier,
        operations: transferOperations({ from: sender, to: randomAddress(), amount: '1' }),
        public_keys: publicKeys,
        metadata: delegatedMetadata
    });

    const cases: Array<[string, string, () => object, number]> = [
        ['missing network_identifier', '/network/status', () => ({}), 22],
        ['wrong network', '/network/status', () => ({ network_identifier: { ...networkIdentifier, network: 'main' } }), 22],
        ['invalid account address', '/account/balance', () => ({ network_identifier: networkIdentifier, account_identifier: { address: '0x1234' } }), 23],
        ['missing account_identifier', '/account/balance', () => ({ network_identifier: networkIdentifier }), 23],
        ['invalid currencies', '/account/balance', () => ({ network_identifier: networkIdentifier, account_identifier: { address: sender.address }, currencies: [{ symbol: 'VET' }] }), 31],
        ['unregistered token', '/account/balance', () => ({ network_identifier: networkIdentifier, account_identifier: { address: sender.address }, currencies: [{ symbol: 'XYZ', decimals: 18, metadata: { contractAddress: randomAddress() } }] }), 1],
        ['unknown block', '/block', () => ({ network_identifier: networkIdentifier, block_identifier: { index: 999999999 } }), 3],
        ['invalid block hash', '/block', () => ({ network_identifier: networkIdentifier, block_identifier: { hash: '0x1234' } }), 24],
        ['missing transaction_identifier', '/block/transaction', () => ({ network_identifier: networkIdentifier, block_identifier: { index: 0 } }), 25],
        ['transaction not in block', '/block/transaction', () => ({ network_identifier: networkIdentifier, block_identifier: { index: 0 }, transaction_identifier: { hash: unknownHash } }), 4],
        ['unknown mempool transaction', '/mempool/transaction', () => ({ network_identifier: networkIdentifier, transaction_identifier: { hash: unknownHash } }), 25],
        ['unknown search transaction', '/search/transactions', () => ({ network_identifier: networkIdentifier, transaction_identifier: { hash: unknownHash } }), 4],
        ['invalid events limit', '/events/blocks', () => ({ network_identifier: networkIdentifier, limit: 0 }), 21],
        ['invalid public key', '/construction/derive', () => ({ network_identifier: networkIdentifier, public_key: { hex_bytes: '1234', curve_type: 'secp256k1' } }), 5],
        ['preprocess without operations', '/construction/preprocess', () => ({ network_identifier: networkIdentifier, operations: [] }), 14],
        ['metadata without clauses', '/construction/metadata', () => ({ network_identifier: networkIdentifier, options: { transactionType: 'dynamic' } }), 15],
        ['payloads without metadata', '/construction/payloads', () => ({ network_identifier: networkIdentifier, operations: transferOperations({ from: sender, to: randomAddress(), amount: '1' }), public_keys: [publicKey] }), 16],
        ['payloads without operations', '/construction/payloads', () => ({ network_identifier: networkIdentifier, public_keys: [publicKey], metadata: {} }), 18],
        ['payloads with more than two public keys', '/construction/payloads', delegatedPayloads([publicKey, delegatorPublicKey, otherPublicKey]), 8],
        ['payloads with a fee delegator but no delegator public key', '/construction/payloads', delegatedPayloads([publicKey]), 28],
        ['payloads with a delegator public key that is not the fee delegator', '/construction/payloads', delegatedPayloads([publicKey, otherPublicKey]), 29],
        ['combine without the origin signature', '/construction/combine', () => { const other = randomAddress(); return { network_identifier: networkIdentifier, unsigned_transaction: unsignedTransaction, signatures: [{ signing_payload: { ...signingPayload, address: other, account_identifier: { address: other } }, public_key: publicKey, signature_type: 'ecdsa_recovery', hex_bytes: signature }] }; }, 20],
        ['combine with an all-zero signature', '/construction/combine', () => ({ network_identifier: networkIdentifier, unsigned_transaction: unsignedTransaction, signatures: [{ signing_payload: signingPayload, public_key: publicKey, signature_type: 'ecdsa_recovery', hex_bytes: '00'.repeat(65) }] }), 20],
        ['combine with a truncated signature', '/construction/combine', () => ({ network_identifier: networkIdentifier, unsigned_transaction: unsignedTransaction, signatures: [{ signing_payload: signingPayload, public_key: publicKey, signature_type: 'ecdsa_recovery', hex_bytes: signature.slice(0, 128) }] }), 20],
        ['combine with a 0x-prefixed signature', '/construction/combine', () => ({ network_identifier: networkIdentifier, unsigned_transaction: unsignedTransaction, signatures: [{ signing_payload: signingPayload, public_key: publicKey, signature_type: 'ecdsa_recovery', hex_bytes: '0x' + signature }] }), 20],
        ['parse invalid signed transaction', '/construction/parse', () => ({ network_identifier: networkIdentifier, signed: true, transaction: '0xdeadbeef' }), 12],
        ['parse signed transaction as unsigned', '/construction/parse', () => ({ network_identifier: networkIdentifier, signed: false, transaction: signedTransaction.slice(0, 20) }), 17],
        ['hash invalid transaction', '/construction/hash', () => ({ network_identifier: networkIdentifier, signed_transaction: '0xdeadbeef' }), 12],
        ['submit invalid transaction', '/construction/submit', () => ({ network_identifier: networkIdentifier, signed_transaction: '0xdeadbeef' }), 12]
    ];

    it.each(cases)('%s (%s)', async (_, endpoint, body, expectedCode) => {
        const response = await rosetta.postRaw<{ code: number }>(endpoint, body());
        expect(response.status).toBe(500);
        schema.expectSchema(response.data, schema.error);
        expect(response.data.code).toBe(expectedCode);
        expect(declaredCodes).toContain(response.data.code);
    });
});
