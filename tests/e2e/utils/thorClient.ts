import axios from 'axios';
import { THOR_URL } from '../config';

// Minimal typed access to the thor REST API, used as the source of truth
// when cross-checking Rosetta responses.

export interface ThorBlock {
    number: number,
    id: string,
    parentID: string,
    timestamp: number,
    baseFeePerGas?: string,
    transactions: string[]
}

export interface ThorAccount {
    balance: string,
    energy: string,
    hasCode: boolean
}

export interface ThorClause {
    to: string | null,
    value: string,
    data: string
}

export interface ThorTransaction {
    id: string,
    type: number,
    chainTag: number,
    blockRef: string,
    expiration: number,
    clauses: ThorClause[],
    gasPriceCoef?: number,
    maxFeePerGas?: string,
    maxPriorityFeePerGas?: string,
    gas: number,
    origin: string,
    delegator: string | null,
    nonce: string,
    meta: { blockID: string, blockNumber: number, blockTimestamp: number } | null
}

export interface ThorReceipt {
    gasUsed: number,
    gasPayer: string,
    paid: string,
    reward: string,
    reverted: boolean,
    meta: { blockID: string, blockNumber: number, blockTimestamp: number, txID: string, txOrigin: string },
    outputs: Array<{
        contractAddress: string | null,
        events: Array<{ address: string, topics: string[], data: string }>,
        transfers: Array<{ sender: string, recipient: string, amount: string }>
    }>
}

export interface ThorFeesHistory {
    oldestBlock: string,
    baseFeePerGas: string[],
    gasUsedRatio: number[],
    reward?: string[][]
}

const get = async <T>(path: string, params?: object): Promise<T> => {
    const response = await axios.get<T>(THOR_URL + path, { params });
    return response.data;
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const thor = {
    block: (revision: string | number) => get<ThorBlock>(`/blocks/${revision}`),
    best: () => get<ThorBlock>('/blocks/best'),
    account: (address: string, revision?: string | number) =>
        get<ThorAccount>(`/accounts/${address}`, revision === undefined ? undefined : { revision }),
    transaction: (id: string) => get<ThorTransaction | null>(`/transactions/${id}`),
    receipt: (id: string) => get<ThorReceipt | null>(`/transactions/${id}/receipt`),
    txpool: () => get<string[]>('/node/txpool'),
    feesHistory: (rewardPercentile: number) =>
        get<ThorFeesHistory>('/fees/history', { blockCount: 1, newestBlock: 'best', rewardPercentiles: rewardPercentile }),
    /** Thor version from the `x-thorest-ver` response header. */
    version: async (): Promise<string> => {
        const response = await axios.get(THOR_URL + '/blocks/0');
        return String(response.headers['x-thorest-ver']);
    },

    async waitForReceipt(id: string, timeoutMs = 30000): Promise<ThorReceipt> {
        const deadline = Date.now() + timeoutMs;
        while (Date.now() < deadline) {
            const receipt = await thor.receipt(id);
            if (receipt) {
                return receipt;
            }
            await sleep(500);
        }
        throw new Error(`Transaction ${id} was not packed within ${timeoutMs}ms`);
    },

    async waitForBlock(number: number, timeoutMs = 30000): Promise<ThorBlock> {
        const deadline = Date.now() + timeoutMs;
        while (Date.now() < deadline) {
            const best = await thor.best();
            if (best.number >= number) {
                return thor.block(number);
            }
            await sleep(500);
        }
        throw new Error(`Block ${number} was not produced within ${timeoutMs}ms`);
    }
};
