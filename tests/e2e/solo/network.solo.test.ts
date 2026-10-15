import { networkIdentifier } from '../config';
import { rosetta } from '../utils/rosettaClient';
import { thor } from '../utils/thorClient';

describe('Network API vs thor', () => {
    it('/network/list reports the network of the connected node', async () => {
        const response = await rosetta.post('/network/list', {});
        expect(response.network_identifiers).toEqual([networkIdentifier]);
    });

    it('/network/status matches thor genesis and current block', async () => {
        const status = await rosetta.call('/network/status');
        const genesis = await thor.block(0);
        expect(status.genesis_block_identifier).toEqual({ index: 0, hash: genesis.id });

        const current = await thor.block(status.current_block_identifier.index);
        expect(status.current_block_identifier.hash).toBe(current.id);
        expect(status.current_block_timestamp).toBe(current.timestamp * 1000);
        expect(status.sync_status.current_index).toBe(current.number);

        const best = await thor.best();
        expect(best.number).toBeGreaterThanOrEqual(current.number);
    });

    it('/network/options reports the version of the connected thor node', async () => {
        const options = await rosetta.call('/network/options');
        expect(await thor.version()).toContain(options.version.node_version);
    });
});
