import { SOLO_ACCOUNTS, randomAddress } from '../config';
import { sendTransfer, waitForPacked } from '../utils/construction';
import { rosetta } from '../utils/rosettaClient';
import * as schema from '../utils/schemas';

describe('Mempool API', () => {
    it('POST /mempool', async () => {
        schema.expectSchema(await rosetta.call('/mempool'), schema.mempoolResponse);
    });

    it('POST /mempool filtered by origin', async () => {
        const response = await rosetta.call('/mempool', { metadata: { origin: SOLO_ACCOUNTS[0].address } });
        schema.expectSchema(response, schema.mempoolResponse);
    });
});

describe('Events API', () => {
    it('POST /events/blocks with defaults', async () => {
        schema.expectSchema(await rosetta.call('/events/blocks'), schema.eventsBlocksResponse);
    });

    it('POST /events/blocks with offset and limit', async () => {
        const response = await rosetta.call('/events/blocks', { offset: 0, limit: 5 });
        schema.expectSchema(response, schema.eventsBlocksResponse);
        expect(response.events.length).toBeLessThanOrEqual(5);
    });
});

describe('Search API', () => {
    let txHash: string;

    beforeAll(async () => {
        txHash = await sendTransfer({ from: SOLO_ACCOUNTS[0], to: randomAddress(), amount: '1000' });
        await waitForPacked(txHash);
    });

    it('POST /search/transactions by transaction identifier', async () => {
        const response = await rosetta.call('/search/transactions', { transaction_identifier: { hash: txHash } });
        schema.expectSchema(response, schema.searchTransactionsResponse);
    });
});
