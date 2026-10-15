import { SOLO_ACCOUNTS, VET, VTHO, randomAddress } from '../config';
import { sendTransfer } from '../utils/construction';
import { rosetta } from '../utils/rosettaClient';
import { thor } from '../utils/thorClient';

// VTHO balances are read through the VTHO (VIP180) contract, while thor's
// /accounts endpoint reports them as `energy`. Comparing the two catches
// decoding bugs that rosetta-cli cannot: VTHO has a "dynamic" balance
// exemption, so check:data accepts any VTHO balance the API returns.

interface BalanceResponse {
    block_identifier: { index: number, hash: string },
    balances: Array<{ value: string, currency: { symbol: string } }>
}

const [funded] = SOLO_ACCOUNTS;

const balanceOf = (response: BalanceResponse, symbol: string): string | undefined =>
    response.balances.find(b => b.currency.symbol === symbol)?.value;

const getBalance = (address: string, extra: object = {}): Promise<BalanceResponse> =>
    rosetta.call('/account/balance', { account_identifier: { address }, ...extra });

describe('Account API vs thor', () => {
    it('VET and VTHO balances match thor /accounts', async () => {
        const response = await getBalance(funded.address);
        const expected = await thor.account(funded.address, response.block_identifier.hash);
        expect(balanceOf(response, 'VET')).toBe(BigInt(expected.balance).toString(10));
        expect(balanceOf(response, 'VTHO')).toBe(BigInt(expected.energy).toString(10));
        // Solo dev accounts are funded with VTHO in genesis.
        expect(BigInt(balanceOf(response, 'VTHO') ?? '0')).toBeGreaterThan(BigInt(0));
    });

    it('VTHO balance matches thor when VTHO is requested explicitly', async () => {
        const response = await getBalance(funded.address, { currencies: [VTHO] });
        const expected = await thor.account(funded.address, response.block_identifier.hash);
        expect(response.balances).toHaveLength(1);
        expect(balanceOf(response, 'VTHO')).toBe(BigInt(expected.energy).toString(10));
    });

    it('historical balances match thor at the same block', async () => {
        const response = await getBalance(funded.address, { block_identifier: { index: 0 } });
        expect(response.block_identifier.index).toBe(0);
        const expected = await thor.account(funded.address, 0);
        expect(balanceOf(response, 'VET')).toBe(BigInt(expected.balance).toString(10));
        expect(balanceOf(response, 'VTHO')).toBe(BigInt(expected.energy).toString(10));
    });

    it('block_identifier resolves to the same block by index and by hash', async () => {
        const byIndex = await getBalance(funded.address, { block_identifier: { index: 1 } });
        const byHash = await getBalance(funded.address, { block_identifier: { hash: byIndex.block_identifier.hash } });
        expect(byHash).toEqual(byIndex);
        expect(byIndex.block_identifier.hash).toBe((await thor.block(1)).id);
    });

    it.each([
        ['VET', VET],
        ['VTHO', VTHO]
    ])('a %s transfer changes the recipient balance by exactly the amount', async (symbol, currency) => {
        const recipient = randomAddress();
        const amount = '123456789';
        const hash = await sendTransfer({ from: funded, to: recipient, amount, currency });
        const receipt = await thor.waitForReceipt(hash);

        const before = await getBalance(recipient, { block_identifier: { index: receipt.meta.blockNumber - 1 } });
        const after = await getBalance(recipient, { block_identifier: { hash: receipt.meta.blockID } });
        expect(balanceOf(before, symbol)).toBe('0');
        expect(balanceOf(after, symbol)).toBe(amount);

        const expected = await thor.account(recipient, receipt.meta.blockID);
        expect(balanceOf(after, 'VET')).toBe(BigInt(expected.balance).toString(10));
        expect(balanceOf(after, 'VTHO')).toBe(BigInt(expected.energy).toString(10));
    });
});
