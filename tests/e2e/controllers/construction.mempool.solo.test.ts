import { ec } from 'elliptic';
import { client, networkIdentifier } from '../setup';

const elliptic = new ec('secp256k1');

describe('Construction and Mempool Controller Solo Network', () => {
    describe('Legacy Transactions', () => {
        let legacyMetadataResponse: any;
        let legacyPayloadsResponse: any;
        let legacyCombineResponse: any;
        describe('POST /construction/metadata', () => {
            it('should return transaction metadata for solo network', async () => {
                const response = await client.post('/construction/metadata', {
                    network_identifier: networkIdentifier,
                    options: {
                        transactionType: "legacy",
                        clauses: [
                            {
                                to: "0x16277a1ff38678291c41d1820957c78bb5da59ce",
                                value: "10000",
                                data: "0x"
                            }
                        ]
                    },
                    required_public_keys: [
                        {
                            address: "0xf077b491b355e64048ce21e3a6fc4751eeea77fa"
                        }
                    ]
                });

                expect(response).toMatchObject({
                    metadata: {
                        transactionType: "legacy",
                        chainTag: 246,
                        blockRef: expect.any(String),
                        gas: 36000,
                        gasPriceCoef: expect.any(Number)
                    },
                    suggested_fee: [
                        {
                            value: "-360000000000000000",
                            currency: {
                                symbol: "VTHO",
                                decimals: 18,
                                metadata: {
                                    contractAddress: "0x0000000000000000000000000000456e65726779"
                                }
                            }
                        }
                    ]
                });

                legacyMetadataResponse = response;
            });
        });

        describe('POST /construction/payloads', () => {
            it('should return signing payloads for solo network', async () => {
                const response = await client.post('/construction/payloads', {
                    network_identifier: networkIdentifier,
                    operations: [
                        {
                            operation_identifier: {
                                index: 0,
                                network_index: 0
                            },
                            type: "Transfer",
                            status: "None",
                            account: {
                                address: "0x16277a1ff38678291c41d1820957c78bb5da59ce"
                            },
                            amount: {
                                value: "10000",
                                currency: {
                                    symbol: "VET",
                                    decimals: 18
                                },
                                metadata: {}
                            }
                        },
                        {
                            operation_identifier: {
                                index: 0,
                                network_index: 1
                            },
                            type: "Transfer",
                            status: "None",
                            account: {
                                address: "0xf077b491b355e64048ce21e3a6fc4751eeea77fa"
                            },
                            amount: {
                                value: "-10000",
                                currency: {
                                    symbol: "VET",
                                    decimals: 18
                                },
                                metadata: {}
                            }
                        },
                        {
                            operation_identifier: {
                                index: 0,
                                network_index: 2
                            },
                            type: "FeeDelegation",
                            status: "None",
                            account: {
                                address: "0x4251630dc820e90a5a6d14d79cac7acb93917983"
                            },
                            amount: {
                                value: "-210000000000000000",
                                currency: {
                                    symbol: "VTHO",
                                    decimals: 18,
                                    metadata: {
                                        contractAddress: "0x0000000000000000000000000000456E65726779"
                                    }
                                },
                                metadata: {}
                            }
                        }
                    ],
                    metadata: legacyMetadataResponse.metadata,
                    public_keys: [
                        {
                            hex_bytes: "03e32e5960781ce0b43d8c2952eeea4b95e286b1bb5f8c1f0c9f09983ba7141d2f",
                            curve_type: "secp256k1"
                        }
                    ]
                });

                expect(response).toMatchObject({
                    unsigned_transaction: expect.any(String),
                    payloads: [
                        {
                            address: "0xf077b491b355e64048ce21e3a6fc4751eeea77fa",
                            hex_bytes: expect.any(String),
                            signature_type: "ecdsa_recovery"
                        }
                    ]
                });

                legacyPayloadsResponse = response;
            });
        });

        describe('POST /construction/combine', () => {
            it('should combine signatures for solo network', async () => {
                const privateKey = '99f0500549792796c14fed62011a51081dc5b5e68fe8bd8a13b86be829c4fd36';
                const key = elliptic.keyFromPrivate(privateKey, 'hex');
                const msgHash = Buffer.from(legacyPayloadsResponse.payloads[0].hex_bytes, 'hex');
                const signature = key.sign(msgHash);
                const signatureHex = signature.r.toString('hex') + signature.s.toString('hex') + (signature.recoveryParam ? '01' : '00');

                const response = await client.post('/construction/combine', {
                    network_identifier: networkIdentifier,
                    unsigned_transaction: legacyPayloadsResponse.unsigned_transaction,
                    signatures: [
                        {
                            signing_payload: legacyPayloadsResponse.payloads[0],
                            public_key: {
                                hex_bytes: "03e32e5960781ce0b43d8c2952eeea4b95e286b1bb5f8c1f0c9f09983ba7141d2f",
                                curve_type: "secp256k1"
                            },
                            signature_type: "ecdsa_recovery",
                            hex_bytes: signatureHex
                        }
                    ]
                });

                expect(response).toMatchObject({
                    signed_transaction: expect.any(String)
                });

                legacyCombineResponse = response;
            });
        });

        describe('POST /construction/submit and mempool endpoints', () => {
            it('should submit transaction and verify it in mempool for solo network', async () => {
                const response = await client.post('/construction/submit', {
                    network_identifier: networkIdentifier,
                    signed_transaction: legacyCombineResponse.signed_transaction
                });

                expect(response).toMatchObject({
                    transaction_identifier: {
                        hash: expect.stringMatching(/^0x[a-fA-F0-9]{64}$/)
                    }
                });

                const mempoolResponse = await client.post('/mempool', {
                    network_identifier: networkIdentifier
                });

                expect(mempoolResponse).toHaveProperty('transaction_identifiers');
                expect(mempoolResponse.transaction_identifiers).toBeInstanceOf(Array);
                expect(mempoolResponse.transaction_identifiers.length).toBeGreaterThan(0);
                
                const txInMempool = mempoolResponse.transaction_identifiers.some(
                    (tx: { hash: string }) => tx.hash === response.transaction_identifier.hash
                );
                expect(txInMempool).toBe(true);

                const mempoolTxResponse = await client.post('/mempool/transaction', {
                    network_identifier: networkIdentifier,
                    transaction_identifier: response.transaction_identifier
                });

                expect(mempoolTxResponse).toHaveProperty('transaction');
                expect(mempoolTxResponse.transaction).toHaveProperty('transaction_identifier');
                expect(mempoolTxResponse.transaction.transaction_identifier.hash).toBe(response.transaction_identifier.hash);
            });
        });
    });

    describe('Dynamic Transactions', () => {
        let dynamicMetadataResponse: any;
        let dynamicPayloadsResponse: any;
        let dynamicCombineResponse: any;

        describe('POST /construction/metadata', () => {
            it('should return transaction metadata for dynamic transaction', async () => {
                const response = await client.post('/construction/metadata', {
                    network_identifier: networkIdentifier,
                    options: {
                        clauses: [
                            {
                                to: "0x16277a1ff38678291c41d1820957c78bb5da59ce",
                                value: "10000",
                                data: "0x"
                            }
                        ]
                    },
                    required_public_keys: [
                        {
                            address: "0xf077b491b355e64048ce21e3a6fc4751eeea77fa"
                        }
                    ]
                });

                expect(response).toMatchObject({
                    metadata: {
                        transactionType: "dynamic",
                        chainTag: 246,
                        blockRef: expect.any(String),
                        gas: 36000,
                        maxFeePerGas: "10000000000000",
                        maxPriorityFeePerGas: "0"
                    },
                    suggested_fee: [
                        {
                            value: "-360000000000000000",
                            currency: {
                                symbol: "VTHO",
                                decimals: 18,
                                metadata: {
                                    contractAddress: "0x0000000000000000000000000000456e65726779"
                                }
                            }
                        }
                    ]
                });

                dynamicMetadataResponse = response;
            });
        });

        describe('POST /construction/payloads', () => {
            it('should return signing payloads for dynamic transaction', async () => {
                const response = await client.post('/construction/payloads', {
                    network_identifier: networkIdentifier,
                    operations: [
                        {
                            operation_identifier: {
                                index: 0,
                                network_index: 0
                            },
                            type: "Transfer",
                            status: "None",
                            account: {
                                address: "0x16277a1ff38678291c41d1820957c78bb5da59ce"
                            },
                            amount: {
                                value: "10000",
                                currency: {
                                    symbol: "VET",
                                    decimals: 18
                                },
                                metadata: {}
                            }
                        },
                        {
                            operation_identifier: {
                                index: 0,
                                network_index: 1
                            },
                            type: "Transfer",
                            status: "None",
                            account: {
                                address: "0xf077b491b355e64048ce21e3a6fc4751eeea77fa"
                            },
                            amount: {
                                value: "-10000",
                                currency: {
                                    symbol: "VET",
                                    decimals: 18
                                },
                                metadata: {}
                            }
                        },
                        {
                            operation_identifier: {
                                index: 0,
                                network_index: 2
                            },
                            type: "FeeDelegation",
                            status: "None",
                            account: {
                                address: "0x4251630dc820e90a5a6d14d79cac7acb93917983"
                            },
                            amount: {
                                value: "-210000000000000000",
                                currency: {
                                    symbol: "VTHO",
                                    decimals: 18,
                                },
                                metadata: {}
                            }
                        }
                    ],
                    metadata: dynamicMetadataResponse.metadata,
                    public_keys: [
                        {
                            hex_bytes: "03e32e5960781ce0b43d8c2952eeea4b95e286b1bb5f8c1f0c9f09983ba7141d2f",
                            curve_type: "secp256k1"
                        }
                    ]
                });

                expect(response).toMatchObject({
                    unsigned_transaction: expect.any(String),
                    payloads: [
                        {
                            address: "0xf077b491b355e64048ce21e3a6fc4751eeea77fa",
                            hex_bytes: expect.any(String),
                            signature_type: "ecdsa_recovery"
                        }
                    ]
                });

                dynamicPayloadsResponse = response;
            });
        });

        describe('POST /construction/combine', () => {
            it('should combine signatures for dynamic transaction', async () => {
                const privateKey = '99f0500549792796c14fed62011a51081dc5b5e68fe8bd8a13b86be829c4fd36';
                const key = elliptic.keyFromPrivate(privateKey, 'hex');
                const msgHash = Buffer.from(dynamicPayloadsResponse.payloads[0].hex_bytes, 'hex');
                const signature = key.sign(msgHash);
                const signatureHex = signature.r.toString('hex') + signature.s.toString('hex') + (signature.recoveryParam ? '01' : '00');

                const response = await client.post('/construction/combine', {
                    network_identifier: networkIdentifier,
                    unsigned_transaction: dynamicPayloadsResponse.unsigned_transaction,
                    signatures: [
                        {
                            signing_payload: dynamicPayloadsResponse.payloads[0],
                            public_key: {
                                hex_bytes: "03e32e5960781ce0b43d8c2952eeea4b95e286b1bb5f8c1f0c9f09983ba7141d2f",
                                curve_type: "secp256k1"
                            },
                            signature_type: "ecdsa_recovery",
                            hex_bytes: signatureHex
                        }
                    ]
                });

                expect(response).toMatchObject({
                    signed_transaction: expect.any(String)
                });

                dynamicCombineResponse = response;
            });
        });

        describe('POST /construction/submit and mempool endpoints', () => {
            it('should submit dynamic transaction and verify it in mempool', async () => {
                const response = await client.post('/construction/submit', {
                    network_identifier: networkIdentifier,
                    signed_transaction: dynamicCombineResponse.signed_transaction
                });

                expect(response).toMatchObject({
                    transaction_identifier: {
                        hash: expect.stringMatching(/^0x[a-fA-F0-9]{64}$/)
                    }
                });

                const mempoolResponse = await client.post('/mempool', {
                    network_identifier: networkIdentifier
                });

                expect(mempoolResponse).toHaveProperty('transaction_identifiers');
                expect(mempoolResponse.transaction_identifiers).toBeInstanceOf(Array);
                expect(mempoolResponse.transaction_identifiers.length).toBeGreaterThan(0);
                
                const txInMempool = mempoolResponse.transaction_identifiers.some(
                    (tx: { hash: string }) => tx.hash === response.transaction_identifier.hash
                );
                expect(txInMempool).toBe(true);

                const mempoolTxResponse = await client.post('/mempool/transaction', {
                    network_identifier: networkIdentifier,
                    transaction_identifier: response.transaction_identifier
                });

                expect(mempoolTxResponse).toHaveProperty('transaction');
                expect(mempoolTxResponse.transaction).toHaveProperty('transaction_identifier');
                expect(mempoolTxResponse.transaction.transaction_identifier.hash).toBe(response.transaction_identifier.hash);
            });
        });
    });
}); 