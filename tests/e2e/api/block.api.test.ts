import { SOLO_ACCOUNTS, VTHO, randomAddress } from '../config';
import { sendTransfer, waitForPacked } from '../utils/construction';
import { rosetta } from '../utils/rosettaClient';
import * as schema from '../utils/schemas';

describe('Block API', () => {
    let vetTx: { hash: string, blockIndex: number, blockHash: string };
    let vthoTx: { hash: string, blockIndex: number, blockHash: string };

    const sendAndWait = async (currency?: typeof VTHO) => {
        const hash = await sendTransfer({ from: SOLO_ACCOUNTS[0], to: randomAddress(), amount: '1000', currency });
        const receipt = await waitForPacked(hash);
        return { hash, blockIndex: receipt.meta.blockNumber, blockHash: receipt.meta.blockID };
    };

    beforeAll(async () => {
        vetTx = await sendAndWait();
        vthoTx = await sendAndWait(VTHO);
    });

    it('POST /block for the genesis block', async () => {
        schema.expectSchema(await rosetta.call('/block', { block_identifier: { index: 0 } }), schema.blockResponse);
    });

    it('POST /block by index for a block with a VET transfer', async () => {
        schema.expectSchema(await rosetta.call('/block', { block_identifier: { index: vetTx.blockIndex } }), schema.blockResponse);
    });

    it('POST /block by hash for a block with a VTHO transfer', async () => {
        schema.expectSchema(await rosetta.call('/block', { block_identifier: { hash: vthoTx.blockHash } }), schema.blockResponse);
    });

    it.each([
        ['VET', () => vetTx],
        ['VTHO', () => vthoTx]
    ])('POST /block/transaction for a %s transfer', async (_, tx) => {
        const response = await rosetta.call('/block/transaction', {
            block_identifier: { index: tx().blockIndex, hash: tx().blockHash },
            transaction_identifier: { hash: tx().hash }
        });
        schema.expectSchema(response, schema.blockTransactionResponse);
    });

    // Rosetta spec: "If neither the hash or index is populated, the current block is returned."
    it('POST /block without index or hash', async () => {
        schema.expectSchema(await rosetta.call('/block', { block_identifier: {} }), schema.blockResponse);
    });
});
