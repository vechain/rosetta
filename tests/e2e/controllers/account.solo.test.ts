import axios from 'axios';
import { client, networkIdentifier } from '../setup';

// VTHO balances are read through the VTHO (VIP180) contract, while thor's
// /accounts endpoint reports them as `energy`. Comparing the two catches
// decoding bugs that rosetta-cli cannot: VTHO has a "dynamic" balance
// exemption, so check:data accepts any VTHO balance the API returns.

const THOR_URL = 'http://127.0.0.1:8669';
const SOLO_ACCOUNT = '0xf077b491b355e64048ce21e3a6fc4751eeea77fa';
const VTHO_CURRENCY = {
    symbol: 'VTHO',
    decimals: 18,
    metadata: {
        contractAddress: '0x0000000000000000000000000000456e65726779'
    }
};

interface ThorAccount {
    balance: string;
    energy: string;
}

interface BalanceResponse {
    block_identifier: { index: number, hash: string };
    balances: Array<{ value: string, currency: { symbol: string } }>;
}

const thorAccount = async (address: string, revision: string): Promise<ThorAccount> => {
    const response = await axios.get<ThorAccount>(`${THOR_URL}/accounts/${address}`, { params: { revision } });
    return response.data;
};

const balanceOf = (response: BalanceResponse, symbol: string): string | undefined =>
    response.balances.find(b => b.currency.symbol === symbol)?.value;

describe('Account Controller - /account/balance', () => {
    it('should return VET and VTHO balances matching thor /accounts', async () => {
        const response: BalanceResponse = await client.post('/account/balance', {
            network_identifier: networkIdentifier,
            account_identifier: { address: SOLO_ACCOUNT }
        });

        const expected = await thorAccount(SOLO_ACCOUNT, response.block_identifier.hash);
        expect(balanceOf(response, 'VET')).toBe(BigInt(expected.balance).toString(10));
        expect(balanceOf(response, 'VTHO')).toBe(BigInt(expected.energy).toString(10));
        // Solo dev accounts are funded with VTHO in genesis.
        expect(BigInt(balanceOf(response, 'VTHO') ?? '0')).toBeGreaterThan(BigInt(0));
    });

    it('should return the VTHO balance when VTHO is requested explicitly', async () => {
        const response: BalanceResponse = await client.post('/account/balance', {
            network_identifier: networkIdentifier,
            account_identifier: { address: SOLO_ACCOUNT },
            currencies: [VTHO_CURRENCY]
        });

        const expected = await thorAccount(SOLO_ACCOUNT, response.block_identifier.hash);
        expect(response.balances).toHaveLength(1);
        expect(balanceOf(response, 'VTHO')).toBe(BigInt(expected.energy).toString(10));
    });

    it('should return historical balances for a given block', async () => {
        const response: BalanceResponse = await client.post('/account/balance', {
            network_identifier: networkIdentifier,
            account_identifier: { address: SOLO_ACCOUNT },
            block_identifier: { index: 0 }
        });

        expect(response.block_identifier.index).toBe(0);
        const expected = await thorAccount(SOLO_ACCOUNT, '0');
        expect(balanceOf(response, 'VET')).toBe(BigInt(expected.balance).toString(10));
        expect(balanceOf(response, 'VTHO')).toBe(BigInt(expected.energy).toString(10));
    });
});
