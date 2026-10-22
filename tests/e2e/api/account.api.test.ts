import { SOLO_ACCOUNTS, VET, VTHO, randomAddress } from '../config';
import { rosetta } from '../utils/rosettaClient';
import * as schema from '../utils/schemas';

const account_identifier = { address: SOLO_ACCOUNTS[0].address };

describe('Account API', () => {
    it('POST /account/balance with all currencies', async () => {
        const response = await rosetta.call('/account/balance', { account_identifier });
        schema.expectSchema(response, schema.accountBalanceResponse);
        expect(response.balances.map((b: { currency: { symbol: string } }) => b.currency.symbol)).toEqual(['VET', 'VTHO']);
    });

    it.each([
        ['VET', VET],
        ['VTHO', VTHO]
    ])('POST /account/balance for %s only', async (_, currency) => {
        const response = await rosetta.call('/account/balance', { account_identifier, currencies: [currency] });
        schema.expectSchema(response, schema.accountBalanceResponse);
        expect(response.balances).toHaveLength(1);
    });

    it('POST /account/balance at a block index', async () => {
        const response = await rosetta.call('/account/balance', { account_identifier, block_identifier: { index: 0 } });
        schema.expectSchema(response, schema.accountBalanceResponse);
    });

    it('POST /account/balance at a block hash', async () => {
        const status = await rosetta.call('/network/status');
        const response = await rosetta.call('/account/balance', {
            account_identifier,
            block_identifier: { hash: status.genesis_block_identifier.hash }
        });
        schema.expectSchema(response, schema.accountBalanceResponse);
    });

    it('POST /account/balance for an account without history', async () => {
        const response = await rosetta.call('/account/balance', { account_identifier: { address: randomAddress() } });
        schema.expectSchema(response, schema.accountBalanceResponse);
    });
});
