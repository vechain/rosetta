import { execSync, StdioOptions } from 'child_process';
import { chmodSync, existsSync, mkdirSync, readdirSync, rmSync } from 'fs';
import { resolve } from 'path';
import { networkIdentifier } from './config';

// The tests run in their own compose project and data dir, so they never stop
// or wipe a node started with `npm run start:*` (project "rosetta", ./rosetta_data).
export const projectRoot = resolve(__dirname, '../..');
const dataDir = resolve(projectRoot, '.e2e_data');

export function compose(args: string, stdio: StdioOptions = 'inherit'): void {
    execSync(`docker compose -p rosetta-e2e ${args}`, {
        cwd: projectRoot,
        stdio,
        env: { ...process.env, NETWORK: networkIdentifier.network, MODE: 'online', ROSETTA_DATA: dataDir }
    });
}

// Empties the data dir for a fresh chain. Files written by the container may
// belong to its uid, so whatever the host user cannot delete is removed from inside the container.
export function resetDataDir(): void {
    try {
        rmSync(dataDir, { recursive: true, force: true });
    } catch {
        compose(`run --rm --no-deps --entrypoint sh rosetta-server -c 'rm -rf /data/* /data/.[!.]*'`);
    }
    if (existsSync(dataDir) && readdirSync(dataDir).length > 0) {
        throw new Error(`Could not clean ${dataDir}`);
    }
    mkdirSync(dataDir, { recursive: true });
    // The container runs as a different uid; mkdirSync's mode is subject to umask.
    chmodSync(dataDir, 0o777);
}
