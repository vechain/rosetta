import axios from 'axios';
import { execSync } from 'child_process';
import { chmodSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { ROSETTA_URL, THOR_URL, networkIdentifier } from './config';

// Starts Rosetta with an embedded thor solo node once for the whole test run.
// Set E2E_REUSE_ENV=1 to run against an environment that is already up
// (e.g. `NETWORK=custom MODE=online docker compose up -d`) and keep it running.

const projectRoot = resolve(__dirname, '../..');

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
        execSync('docker compose down -v', { cwd: projectRoot, stdio: 'ignore' });
        const dataDir = resolve(projectRoot, 'rosetta_data');
        try {
            rmSync(dataDir, { recursive: true, force: true });
        } catch (error) {
            // Files written by the container may belong to another user.
            console.warn(`Could not clean ${dataDir}, reusing it:`, error);
        }
        if (!existsSync(dataDir)) {
            mkdirSync(dataDir);
        }
        // The container runs as a different uid; mkdirSync's mode is subject to umask.
        chmodSync(dataDir, 0o777);
        execSync('docker compose up -d', {
            cwd: projectRoot,
            stdio: 'inherit',
            env: { ...process.env, NETWORK: networkIdentifier.network, MODE: 'online' }
        });
    }

    await waitFor('thor base fee', async () =>
        (await axios.get(`${THOR_URL}/blocks/best`)).data.baseFeePerGas !== undefined);
    await waitFor('rosetta /network/status', async () =>
        (await axios.post(`${ROSETTA_URL}/network/status`, { network_identifier: networkIdentifier })).status === 200);
    console.log('✅ Environment ready\n');
}
