import axios from 'axios';
import { writeFileSync } from 'fs';
import { compose, resetDataDir } from './compose';
import { ROSETTA_URL, THOR_URL, networkIdentifier } from './config';

// Starts Rosetta with an embedded thor solo node once for the whole test run.
// Set E2E_REUSE_ENV=1 to run against an environment that is already up
// (e.g. `NETWORK=custom MODE=online docker compose up -d`) and keep it running.

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const waitFor = async (what: string, check: () => Promise<boolean>, timeoutMs = 120000): Promise<void> => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        try {
            if (await check()) {
                return;
            }
        } catch {
            // not ready yet
        }
        await sleep(1000);
    }
    throw new Error(`Timed out waiting for ${what}`);
};

export default async function globalSetup(): Promise<void> {
    if (process.env.E2E_RECORD_FILE) {
        // Start a fresh recording for tests/sdk-conformance.
        writeFileSync(process.env.E2E_RECORD_FILE, '');
    }

    if (process.env.E2E_REUSE_ENV !== '1') {
        console.log('\n🐳 Starting Rosetta + thor solo (docker compose)...');
        compose('down -v', 'ignore');
        resetDataDir();
        compose('up -d');
    }

    await waitFor('thor base fee', async () =>
        (await axios.get(`${THOR_URL}/blocks/best`)).data.baseFeePerGas !== undefined);
    await waitFor('rosetta /network/status', async () =>
        (await axios.post(`${ROSETTA_URL}/network/status`, { network_identifier: networkIdentifier })).status === 200);
    console.log('✅ Environment ready\n');
}
