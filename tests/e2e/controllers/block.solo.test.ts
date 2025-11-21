import { client, networkIdentifier } from '../setup';

describe('Block Controller - block_identifier validation', () => {
    it('should accept block_identifier with only index', async () => {
        const response = await client.post('/block', {
            network_identifier: networkIdentifier,
            block_identifier: {
                index: 0
            }
        });

        expect(response).toHaveProperty('block');
        expect(response.block).toHaveProperty('block_identifier');
        expect(response.block.block_identifier).toHaveProperty('index');
        expect(response.block.block_identifier.index).toBe(0);
    });
});


