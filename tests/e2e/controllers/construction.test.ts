import { client } from '../setup';

describe('Construction Controller', () => {
    const networkIdentifier = {
        blockchain: 'vechainthor',
        network: 'https://raw.githubusercontent.com/vechain/thor-galactica/refs/heads/main/artifacts/galactica-genesis.json'
    };

    describe('POST /construction/preprocess', () => {
        it('should preprocess valid transaction', async () => {
            const response = await client.post('/construction/preprocess', {
                network_identifier: networkIdentifier,
                operations: [
                    {
                        operation_identifier: {
                            index: 0,
                            network_index: 0
                        },
                        type: 'Transfer',
                        account: {
                            address: '0xc05c334533c673582616ac2bf404b6c55efa1087'
                        },
                        amount: {
                            value: '-10000',
                            currency: {
                                symbol: 'VET',
                                decimals: 18
                            }
                        }
                    },
                    {
                        operation_identifier: {
                            index: 0,
                            network_index: 1
                        },
                        type: 'Transfer',
                        account: {
                            address: '0x16277a1ff38678291c41d1820957c78bb5da59ce'
                        },
                        amount: {
                            value: '10000',
                            currency: {
                                symbol: 'VET',
                                decimals: 18
                            }
                        }
                    }
                ]
            });

            expect(response).toStrictEqual(
                {
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
                            address: "0xc05c334533c673582616ac2bf404b6c55efa1087"
                        }
                    ]
                }
            )
        });
    });

    describe('POST /construction/metadata', () => {
        it('should return transaction metadata', async () => {
            const response = await client.post('/construction/metadata', {
                network_identifier: networkIdentifier,
                options: {
                    clauses: [
                        {
                            to: '0x16277a1ff38678291c41d1820957c78bb5da59ce',
                            value: '10000',
                            data: '0x'
                        }
                    ]
                },
                required_public_keys: [
                    {
                        address: '0xc05c334533c673582616ac2bf404b6c55efa1087'
                    }
                ]
            });

            expect(response).toMatchObject({
                metadata: {
                    transactionType: "dynamic",
                    chainTag: 228,
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
        });
    });

    describe('POST /construction/payloads', () => {
        it('should return signing payloads', async () => {
            const response = await client.post('/construction/payloads', {
                network_identifier: networkIdentifier,
                operations: [
                    {
                        operation_identifier: {
                            index: 0,
                            network_index: 0
                        },
                        type: 'Transfer',
                        status: 'None',
                        account: {
                            address: '0x16277a1ff38678291c41d1820957c78bb5da59ce'
                        },
                        amount: {
                            value: '10000',
                            currency: {
                                symbol: 'VET',
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
                        type: 'Transfer',
                        status: 'None',
                        account: {
                            address: '0xc05c334533c673582616ac2bf404b6c55efa1087'
                        },
                        amount: {
                            value: '-10000',
                            currency: {
                                symbol: 'VET',
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
                        type: 'FeeDelegation',
                        status: 'None',
                        account: {
                            address: '0x4251630dc820e90a5a6d14d79cac7acb93917983'
                        },
                        amount: {
                            value: '-210000000000000000',
                            currency: {
                                symbol: 'VTHO',
                                decimals: 18,
                                metadata: {
                                    contractAddress: '0x0000000000000000000000000000456E65726779'
                                }
                            },
                            metadata: {}
                        }
                    }
                ],
                metadata: {
                    transactionType: 'legacy',
                    blockRef: '0x0000039791786ecd',
                    chainTag: 228,
                    gas: 36000,
                    nonce: '0x69f045ffc9f2c1af',
                    gasPriceCoef: 203
                },
                public_keys: [
                    {
                        hex_bytes: '02d992bd203d2bf888389089db13d2d0807c1697091de377998efe6cf60d66fbb3',
                        curve_type: 'secp256k1'
                    },
                    {
                        hex_bytes: '03a7e5b27bf35f3b1a863851a02b4d722927cd12f92bfb21f69c81c22fc4a1c6d3',
                        curve_type: 'secp256k1'
                    }
                ]
            });

            expect(response).toHaveProperty('unsigned_transaction');
            expect(response).toHaveProperty('payloads');
            expect(response.payloads).toBeInstanceOf(Array);
        });
    });

    describe('POST /construction/combine', () => {
        it('should combine signatures', async () => {
            const response = await client.post('/construction/combine', {
                network_identifier: networkIdentifier,
                unsigned_transaction: '0xf84a81e486039791786ecd81b4dad99416277a1ff38678291c41d1820957c78bb5da59ce82271080828ca08869f045ffc9f2c1af94c05c334533c673582616ac2bf404b6c55efa10878081cb',
                signatures: [
                    {
                        signing_payload: {
                            address: '0xc05c334533c673582616ac2bf404b6c55efa1087',
                            hex_bytes: '894915aeafa5f96ac25f6e0ea0945542888874ecc3113567e96a687d83bf271d',
                            signature_type: 'ecdsa_recovery'
                        },
                        public_key: {
                            hex_bytes: '02d992bd203d2bf888389089db13d2d0807c1697091de377998efe6cf60d66fbb3',
                            curve_type: 'secp256k1'
                        },
                        signature_type: 'ecdsa_recovery',
                        hex_bytes: '4ad82781abf5866020c9bf6a7b07f94ba4bb9e95ac1ca3c858ded24c08b6856213589bac265f656a87da255b855cfab9a96020d450593df2481015188ae7927000'
                    }
                ]
            });

            expect(response).toHaveProperty('signed_transaction');
        });
    });

    describe('POST /construction/parse', () => {
        it('should parse unsigned transaction', async () => {
            const response = await client.post('/construction/parse', {
                network_identifier: networkIdentifier,
                signed: false,
                transaction: '0xf85081e486039791786ecd81b4dad99416277a1ff38678291c41d1820957c78bb5da59ce82271080828ca088e6e47234f992efad94c05c334533c673582616ac2bf404b6c55efa1087808609184e72a00080'
            });

            expect(response).toHaveProperty('operations');
            expect(response.operations).toBeInstanceOf(Array);
        });

        it('should parse signed transaction', async () => {
            const response = await client.post('/construction/parse', {
                network_identifier: networkIdentifier,
                signed: true,
                transaction: '0xf88d81e486039791786ecd81b4dad99416277a1ff38678291c41d1820957c78bb5da59ce82271080828ca08869f045ffc9f2c1af94c05c334533c673582616ac2bf404b6c55efa10878081cbb8414ad82781abf5866020c9bf6a7b07f94ba4bb9e95ac1ca3c858ded24c08b6856213589bac265f656a87da255b855cfab9a96020d450593df2481015188ae7927000'
            });

            expect(response).toHaveProperty('operations');
            expect(response).toHaveProperty('account_identifier_signers');
            expect(response.operations).toBeInstanceOf(Array);
        });
    });

    describe('POST /construction/hash', () => {
        it('should return transaction hash', async () => {
            const response = await client.post('/construction/hash', {
                network_identifier: networkIdentifier,
                signed_transaction: '0xf88d81e486039791786ecd81b4dad99416277a1ff38678291c41d1820957c78bb5da59ce82271080828ca08869f045ffc9f2c1af94c05c334533c673582616ac2bf404b6c55efa10878081cbb8414ad82781abf5866020c9bf6a7b07f94ba4bb9e95ac1ca3c858ded24c08b6856213589bac265f656a87da255b855cfab9a96020d450593df2481015188ae7927000'
            });

            expect(response).toHaveProperty('transaction_identifier');
            expect(response.transaction_identifier).toHaveProperty('hash');
        });
    });

    describe('POST /construction/submit', () => {
        it('should submit transaction', async () => {
            const response = await client.post('/construction/submit', {
                network_identifier: networkIdentifier,
                signed_transaction: '0xf88d81e486039791786ecd81b4dad99416277a1ff38678291c41d1820957c78bb5da59ce82271080828ca08869f045ffc9f2c1af94c05c334533c673582616ac2bf404b6c55efa10878081cbb8414ad82781abf5866020c9bf6a7b07f94ba4bb9e95ac1ca3c858ded24c08b6856213589bac265f656a87da255b855cfab9a96020d450593df2481015188ae7927000'
            });

            expect(response).toHaveProperty('transaction_identifier');
            expect(response.transaction_identifier).toHaveProperty('hash');
        });
    });
}); 