import { TransactionIdentifier } from '../../../src/common/types/identifiers';
import { client, networkIdentifier } from '../setup';

describe('Mempool Controller Galactica Devnet', () => {
    describe('POST /mempool', () => {
        it('should return a list of pending transactions', async () => {
            const response = await client.post('/mempool', {
                network_identifier: networkIdentifier
            });

            expect(response).toHaveProperty('transaction_identifiers');
            expect(response.transaction_identifiers).toBeInstanceOf(Array);
            response.transaction_identifiers.forEach((tx: TransactionIdentifier) => {
                expect(tx.hash).toMatch(/^0x[0-9a-f]{64}$/);
            });
        });
    });

    describe('POST /mempool/transaction', () => {
        it('should return transaction details for a specific transaction', async () => {
            const mempoolResponse = await client.post('/mempool', {
                network_identifier: networkIdentifier
            });

            expect(mempoolResponse.transaction_identifiers).toBeInstanceOf(Array);
            expect(mempoolResponse.transaction_identifiers.length).toBeGreaterThan(0);
            
            const txHash = mempoolResponse.transaction_identifiers[0].hash;
            const response = await client.post('/mempool/transaction', {
                network_identifier: networkIdentifier,
                transaction_identifier: {
                    hash: txHash
                }
            });

            expect(response).toHaveProperty('transaction');
            expect(response.transaction).toHaveProperty('transaction_identifier');
            expect(response.transaction.transaction_identifier.hash).toBe(txHash);
            expect(response.transaction).toHaveProperty('operations');
            expect(response.transaction.operations).toBeInstanceOf(Array);
        });

        it('should return error for non-existent transaction', async () => {
            let error: Error | undefined;
            try {
                await client.post('/mempool/transaction', {
                    network_identifier: networkIdentifier,
                    transaction_identifier: {
                        hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
                    }
                });
            } catch (e) {
                error = e as Error;
            }
            expect(error).toBeDefined();
            expect(error?.message).toContain('API Error: 500');
        });
    });
}); 