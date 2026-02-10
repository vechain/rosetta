import { ec } from 'elliptic';
import { client, networkIdentifier } from '../setup';

const elliptic = new ec('secp256k1');

const RECIPIENT_ADDRESS = "0x16277a1ff38678291c41d1820957c78bb5da59ce";
const SENDER_ADDRESS = "0xf077b491b355e64048ce21e3a6fc4751eeea77fa";
const DELEGATOR_ADDRESS = "0x4251630dc820e90a5a6d14d79cac7acb93917983";
const VTHO_CONTRACT_ADDRESS = "0x0000000000000000000000000000456e65726779";

const TRANSFER_AMOUNT = "10000";
const FEE_AMOUNT = "-210000000000000000";
const GAS_AMOUNT = "36000";
const GAS_FEE = "-360000000000000000";

const PUBLIC_KEY_HEX = "03e32e5960781ce0b43d8c2952eeea4b95e286b1bb5f8c1f0c9f09983ba7141d2f";
const PRIVATE_KEY_HEX = '99f0500549792796c14fed62011a51081dc5b5e68fe8bd8a13b86be829c4fd36';

// Solo network can have different chainTags depending on Thor version
// 0xf6 (246) = Thor v2.4.0 release builds
// 0x58 (88) = Thor v2.4.0+ dev builds
const VALID_SOLO_CHAIN_TAGS = [246, 88];

const createClause = () => ({
    to: RECIPIENT_ADDRESS,
    value: TRANSFER_AMOUNT,
    data: "0x"
});

const createOperations = () => [
    {
        operation_identifier: {
            index: 0,
            network_index: 0
        },
        type: "Transfer",
        status: "None",
        account: {
            address: RECIPIENT_ADDRESS
        },
        amount: {
            value: TRANSFER_AMOUNT,
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
            address: SENDER_ADDRESS
        },
        amount: {
            value: `-${TRANSFER_AMOUNT}`,
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
            address: DELEGATOR_ADDRESS
        },
        amount: {
            value: FEE_AMOUNT,
            currency: {
                symbol: "VTHO",
                decimals: 18,
                metadata: {
                    contractAddress: VTHO_CONTRACT_ADDRESS
                }
            },
            metadata: {}
        }
    }
];

const createPublicKey = () => ({
    hex_bytes: PUBLIC_KEY_HEX,
    curve_type: "secp256k1"
});

const createRequiredPublicKey = () => ({
    address: SENDER_ADDRESS
});

const signPayload = (payload: any) => {
    const key = elliptic.keyFromPrivate(PRIVATE_KEY_HEX, 'hex');
    const msgHash = Buffer.from(payload.hex_bytes, 'hex');
    const signature = key.sign(msgHash);
    const r = signature.r.toString('hex').padStart(64, '0');
    const s = signature.s.toString('hex').padStart(64, '0');
    const v = signature.recoveryParam ? '01' : '00';
    return r + s + v;
};

const verifyMempoolTransaction = async (txHash: string) => {
    const mempoolResponse = await client.post('/mempool', {
        network_identifier: networkIdentifier
    });

    expect(mempoolResponse).toHaveProperty('transaction_identifiers');
    expect(mempoolResponse.transaction_identifiers).toBeInstanceOf(Array);
    expect(mempoolResponse.transaction_identifiers.length).toBeGreaterThan(0);
    
    const txInMempool = mempoolResponse.transaction_identifiers.some(
        (tx: { hash: string }) => tx.hash === txHash
    );
    expect(txInMempool).toBe(true);

    const mempoolTxResponse = await client.post('/mempool/transaction', {
        network_identifier: networkIdentifier,
        transaction_identifier: { hash: txHash }
    });

    expect(mempoolTxResponse).toHaveProperty('transaction');
    expect(mempoolTxResponse.transaction).toHaveProperty('transaction_identifier');
    expect(mempoolTxResponse.transaction.transaction_identifier.hash).toBe(txHash);
};

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
                        clauses: [createClause()]
                    },
                    required_public_keys: [createRequiredPublicKey()]
                });

                expect(response).toMatchObject({
                    metadata: {
                        transactionType: "legacy",
                        chainTag: expect.any(Number),
                        blockRef: expect.any(String),
                        gas: parseInt(GAS_AMOUNT),
                        gasPriceCoef: expect.any(Number)
                    },
                    suggested_fee: [
                        {
                            value: GAS_FEE,
                            currency: {
                                symbol: "VTHO",
                                decimals: 18,
                                metadata: {
                                    contractAddress: VTHO_CONTRACT_ADDRESS
                                }
                            }
                        }
                    ]
                });

                // Verify chainTag is one of the valid solo network values
                expect(VALID_SOLO_CHAIN_TAGS).toContain(response.metadata.chainTag);

                legacyMetadataResponse = response;
            });
        });

        describe('POST /construction/payloads', () => {
            it('should return signing payloads for solo network', async () => {
                const response = await client.post('/construction/payloads', {
                    network_identifier: networkIdentifier,
                    operations: createOperations(),
                    metadata: legacyMetadataResponse.metadata,
                    public_keys: [createPublicKey()]
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
                const signatureHex = signPayload(legacyPayloadsResponse.payloads[0]);

                const response = await client.post('/construction/combine', {
                    network_identifier: networkIdentifier,
                    unsigned_transaction: legacyPayloadsResponse.unsigned_transaction,
                    signatures: [
                        {
                            signing_payload: legacyPayloadsResponse.payloads[0],
                            public_key: createPublicKey(),
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

                await verifyMempoolTransaction(response.transaction_identifier.hash);
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
                        clauses: [createClause()]
                    },
                    required_public_keys: [createRequiredPublicKey()]
                });

                // Validate response structure
                expect(response).toMatchObject({
                    metadata: {
                        transactionType: "dynamic",
                        chainTag: expect.any(Number),
                        blockRef: expect.any(String),
                        gas: parseInt(GAS_AMOUNT),
                        maxFeePerGas: expect.any(String),
                        maxPriorityFeePerGas: expect.any(String)
                    },
                    suggested_fee: [
                        {
                            value: expect.any(String),
                            currency: {
                                symbol: "VTHO",
                                decimals: 18,
                                metadata: {
                                    contractAddress: VTHO_CONTRACT_ADDRESS
                                }
                            }
                        }
                    ]
                });

                // Verify chainTag is one of the valid solo network values
                expect(VALID_SOLO_CHAIN_TAGS).toContain(response.metadata.chainTag);

                // Validate dynamic fee values are reasonable
                // Note: Thor's fee history API returns different values based on blockchain state
                // (genesis vs established blocks), so we validate ranges instead of exact values
                const metadata = response.metadata;
                const suggestedFee = response.suggested_fee[0];

                const maxFeePerGas = BigInt(metadata.maxFeePerGas);
                const maxPriorityFeePerGas = BigInt(metadata.maxPriorityFeePerGas);
                const gas = BigInt(metadata.gas);
                const feeValue = BigInt(suggestedFee.value);

                // maxFeePerGas should be positive
                expect(maxFeePerGas).toBeGreaterThan(BigInt(0));

                // maxPriorityFeePerGas should be non-negative
                expect(maxPriorityFeePerGas).toBeGreaterThanOrEqual(BigInt(0));

                // Priority fee should not exceed max fee
                expect(maxPriorityFeePerGas).toBeLessThanOrEqual(maxFeePerGas);

                // Fees should be within reasonable bounds
                // Based on config initialBaseFee: 10000000000000 (10 trillion wei)
                // Reasonable range: 1 trillion to 10 quadrillion
                const MIN_REASONABLE_FEE = BigInt("1000000000000");      // 1 trillion
                const MAX_REASONABLE_FEE = BigInt("10000000000000000");  // 10 quadrillion

                expect(maxFeePerGas).toBeGreaterThanOrEqual(MIN_REASONABLE_FEE);
                expect(maxFeePerGas).toBeLessThanOrEqual(MAX_REASONABLE_FEE);

                // Suggested fee should be negative (represents a cost)
                expect(feeValue).toBeLessThan(BigInt(0));

                // Suggested fee should be approximately gas * maxFeePerGas
                // Allow 10% tolerance for calculation differences
                const expectedFee = -(gas * maxFeePerGas);
                const tolerance = (gas * maxFeePerGas) / BigInt(10); // Use positive value for tolerance

                expect(feeValue).toBeGreaterThan(expectedFee - tolerance);
                expect(feeValue).toBeLessThan(expectedFee + tolerance);

                dynamicMetadataResponse = response;
            });
        });

        describe('POST /construction/payloads', () => {
            it('should return signing payloads for dynamic transaction', async () => {
                const response = await client.post('/construction/payloads', {
                    network_identifier: networkIdentifier,
                    operations: createOperations(),
                    metadata: dynamicMetadataResponse.metadata,
                    public_keys: [createPublicKey()]
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
                const signatureHex = signPayload(dynamicPayloadsResponse.payloads[0]);

                const response = await client.post('/construction/combine', {
                    network_identifier: networkIdentifier,
                    unsigned_transaction: dynamicPayloadsResponse.unsigned_transaction,
                    signatures: [
                        {
                            signing_payload: dynamicPayloadsResponse.payloads[0],
                            public_key: createPublicKey(),
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

                await verifyMempoolTransaction(response.transaction_identifier.hash);
            });
        });
    });
}); 