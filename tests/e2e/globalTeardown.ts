import { compose } from './compose';

export default async function globalTeardown(): Promise<void> {
    if (process.env.E2E_REUSE_ENV === '1') {
        return;
    }
    if (process.env.E2E_SHOW_LOGS === '1') {
        compose('logs --tail=200');
    }
    compose('down -v');
}
