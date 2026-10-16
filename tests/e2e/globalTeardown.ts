import { execSync } from 'child_process';
import { resolve } from 'path';

export default async function globalTeardown(): Promise<void> {
    if (process.env.E2E_REUSE_ENV === '1') {
        return;
    }
    const projectRoot = resolve(__dirname, '../..');
    if (process.env.E2E_SHOW_LOGS === '1') {
        execSync('docker compose logs --tail=200', { cwd: projectRoot, stdio: 'inherit' });
    }
    execSync('docker compose down -v', { cwd: projectRoot, stdio: 'inherit' });
}
