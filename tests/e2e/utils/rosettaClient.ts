import axios, { AxiosInstance } from 'axios';
import { appendFileSync } from 'fs';
import { ROSETTA_URL, networkIdentifier } from '../config';

export interface RawResponse<T = unknown> {
    status: number,
    data: T
}

export class RosettaClient {
    private readonly http: AxiosInstance;

    constructor(baseURL: string = ROSETTA_URL) {
        this.http = axios.create({
            baseURL,
            headers: { 'Content-Type': 'application/json' },
            validateStatus: () => true
        });
    }

    /** POSTs and returns the body; throws on a non-2xx status. */
    async post<T = any>(endpoint: string, data: object): Promise<T> {
        const response = await this.postRaw<T>(endpoint, data);
        if (response.status < 200 || response.status >= 300) {
            throw new Error(`Rosetta ${endpoint} returned ${response.status}: ${JSON.stringify(response.data)}`);
        }
        return response.data;
    }

    /** POSTs and returns status and body without throwing, for error-path tests. */
    async postRaw<T = unknown>(endpoint: string, data: object): Promise<RawResponse<T>> {
        const response = await this.http.post<T>(endpoint, data);
        if (process.env.E2E_RECORD_FILE) {
            // One JSON line per exchange, for offline conformance checks (tests/sdk-conformance).
            appendFileSync(process.env.E2E_RECORD_FILE, JSON.stringify({
                endpoint,
                request: data,
                status: response.status,
                response: response.data
            }) + '\n');
        }
        return { status: response.status, data: response.data };
    }

    /** POSTs with network_identifier filled in. */
    async call<T = any>(endpoint: string, data: object = {}): Promise<T> {
        return this.post<T>(endpoint, { network_identifier: networkIdentifier, ...data });
    }

    /**
     * Waits until /network/status reports `index` as part of the chain.
     *
     * Rosetta follows the chain head through connex, which polls on mainnet's
     * ~10s block interval and so lags solo's 1s blocks. Like any Rosetta client,
     * tests must only query blocks up to the reported current block.
     */
    async waitForBlock(index: number, timeoutMs = 60000): Promise<void> {
        const deadline = Date.now() + timeoutMs;
        while (Date.now() < deadline) {
            const status = await this.call<{ current_block_identifier: { index: number } }>('/network/status');
            if (status.current_block_identifier.index >= index) {
                return;
            }
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        throw new Error(`Rosetta did not reach block ${index} within ${timeoutMs}ms`);
    }
}

export const rosetta = new RosettaClient();
