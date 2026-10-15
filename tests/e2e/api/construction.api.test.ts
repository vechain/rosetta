import { SOLO_ACCOUNTS, VTHO, randomAddress } from '../config';
import { ConstructedTransfer, TransactionType, TransferIntent, constructTransfer } from '../utils/construction';
import { rosetta } from '../utils/rosettaClient';
import * as schema from '../utils/schemas';

const [sender, delegator] = SOLO_ACCOUNTS;

describe('Construction API', () => {
    it('POST /construction/derive', async () => {
        const response = await rosetta.call('/construction/derive', {
            public_key: { hex_bytes: sender.publicKey, curve_type: 'secp256k1' }
        });
        schema.expectSchema(response, schema.constructionDeriveResponse);
    });

    const cases: Array<[string, Omit<TransferIntent, 'from' | 'to'>]> = [
        ['dynamic VET transfer', { amount: '1000' }],
        ['legacy VET transfer', { amount: '1000', transactionType: 'legacy' as TransactionType }],
        ['VTHO transfer', { amount: '1000', currency: VTHO }],
        ['fee-delegated VET transfer', { amount: '1000', delegator }]
    ];

    describe.each(cases)('%s', (_, intent) => {
        let constructed: ConstructedTransfer;

        beforeAll(async () => {
            constructed = await constructTransfer({ from: sender, to: randomAddress(), ...intent });
        });

        it('preprocess', () => schema.expectSchema(constructed.preprocess, schema.constructionPreprocessResponse));
        it('metadata', () => schema.expectSchema(constructed.metadata, schema.constructionMetadataResponse));
        it('payloads', () => schema.expectSchema(constructed.payloads, schema.constructionPayloadsResponse));
        it('parse (unsigned)', () => schema.expectSchema(constructed.parsedUnsigned, schema.constructionParseResponse));
        it('combine', () => schema.expectSchema(constructed.combine, schema.constructionCombineResponse));
        it('parse (signed)', () => schema.expectSchema(constructed.parsedSigned, schema.constructionParseResponse));

        it('hash', async () => {
            const response = await rosetta.call('/construction/hash', { signed_transaction: constructed.combine.signed_transaction });
            schema.expectSchema(response, schema.transactionIdentifierResponse);
        });

        it('submit', async () => {
            const response = await rosetta.call('/construction/submit', { signed_transaction: constructed.combine.signed_transaction });
            schema.expectSchema(response, schema.transactionIdentifierResponse);
        });
    });
});
