import { rosetta } from '../utils/rosettaClient';
import * as schema from '../utils/schemas';

describe('Network API', () => {
    it('POST /network/list', async () => {
        schema.expectSchema(await rosetta.post('/network/list', {}), schema.networkListResponse);
    });

    it('POST /network/options', async () => {
        schema.expectSchema(await rosetta.call('/network/options'), schema.networkOptionsResponse);
    });

    it('POST /network/status', async () => {
        schema.expectSchema(await rosetta.call('/network/status'), schema.networkStatusResponse);
    });
});
