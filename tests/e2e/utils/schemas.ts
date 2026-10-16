import Joi from 'joi';

// Response schemas following the Rosetta API spec (v1.4.x):
// https://docs.cdp.coinbase.com/mesh/reference/api-reference
// Objects reject keys the spec does not define, so a misplaced or misspelled
// field fails the test instead of being silently ignored.

const hash = Joi.string().pattern(/^0x[0-9a-f]{64}$/);
const address = Joi.string().pattern(/^0x[0-9a-f]{40}$/);
const hex = Joi.string().pattern(/^(0x)?[0-9a-f]*$/);
const integerString = Joi.string().pattern(/^-?\d+$/);
const index = Joi.number().integer().min(0);
const metadata = Joi.object().unknown(true);

export const networkIdentifier = Joi.object({
    blockchain: Joi.string().required(),
    network: Joi.string().required(),
    sub_network_identifier: Joi.object({ network: Joi.string().required(), metadata })
});

export const blockIdentifier = Joi.object({
    index: index.required(),
    hash: hash.required()
});

export const transactionIdentifier = Joi.object({
    hash: hash.required()
});

export const accountIdentifier = Joi.object({
    address: address.required(),
    sub_account: Joi.object({ address: Joi.string().required(), metadata }),
    metadata
});

export const currency = Joi.object({
    symbol: Joi.string().required(),
    decimals: index.required(),
    metadata
});

export const amount = Joi.object({
    value: integerString.required(),
    currency: currency.required(),
    metadata
});

export const operationIdentifier = Joi.object({
    index: index.required(),
    network_index: index
});

export const operation = Joi.object({
    operation_identifier: operationIdentifier.required(),
    related_operations: Joi.array().items(operationIdentifier),
    type: Joi.string().required(),
    status: Joi.string(),
    account: accountIdentifier,
    amount,
    coin_change: Joi.object(),
    metadata
});

// On-chain and mempool operations must carry a status; construction intents
// must not (rosetta-sdk-go asserter.Operation, `construction` flag).
export const dataOperation = operation.keys({ status: Joi.string().required() });
export const intentOperation = operation.keys({ status: Joi.forbidden() });

export const transaction = Joi.object({
    transaction_identifier: transactionIdentifier.required(),
    operations: Joi.array().items(dataOperation).required(),
    related_transactions: Joi.array(),
    metadata
});

export const block = Joi.object({
    block_identifier: blockIdentifier.required(),
    parent_block_identifier: blockIdentifier.required(),
    timestamp: Joi.number().integer().min(0).required(),
    transactions: Joi.array().items(transaction).required(),
    metadata
});

export const error = Joi.object({
    code: Joi.number().integer().min(0).required(),
    message: Joi.string().required(),
    description: Joi.string(),
    retriable: Joi.boolean().required(),
    details: Joi.any()
});

export const publicKey = Joi.object({
    hex_bytes: hex.required(),
    curve_type: Joi.string().required()
});

export const signingPayload = Joi.object({
    address,
    account_identifier: accountIdentifier,
    hex_bytes: hex.required(),
    signature_type: Joi.string()
});

// ---- Data API responses ----

export const networkListResponse = Joi.object({
    network_identifiers: Joi.array().items(networkIdentifier).min(1).required()
});

export const networkOptionsResponse = Joi.object({
    version: Joi.object({
        rosetta_version: Joi.string().required(),
        node_version: Joi.string().required(),
        middleware_version: Joi.string(),
        metadata
    }).required(),
    allow: Joi.object({
        operation_statuses: Joi.array().items(Joi.object({
            status: Joi.string().required(),
            successful: Joi.boolean().required()
        })).required(),
        operation_types: Joi.array().items(Joi.string()).required(),
        errors: Joi.array().items(error).required(),
        historical_balance_lookup: Joi.boolean().required(),
        timestamp_start_index: index,
        call_methods: Joi.array().items(Joi.string()).required(),
        balance_exemptions: Joi.array().items(Joi.object({
            sub_account_address: Joi.string(),
            currency,
            exemption_type: Joi.string().valid('greater_or_equal', 'less_or_equal', 'dynamic')
        })).required(),
        mempool_coins: Joi.boolean().required(),
        block_hash_case: Joi.string(),
        transaction_hash_case: Joi.string()
    }).required()
});

export const networkStatusResponse = Joi.object({
    current_block_identifier: blockIdentifier.required(),
    current_block_timestamp: Joi.number().integer().min(0).required(),
    genesis_block_identifier: blockIdentifier.required(),
    oldest_block_identifier: blockIdentifier,
    sync_status: Joi.object({
        current_index: index,
        target_index: index,
        stage: Joi.string(),
        synced: Joi.boolean()
    }),
    peers: Joi.array().items(Joi.object({ peer_id: Joi.string().required(), metadata }))
});

export const accountBalanceResponse = Joi.object({
    block_identifier: blockIdentifier.required(),
    balances: Joi.array().items(amount).required(),
    metadata
});

export const blockResponse = Joi.object({
    block: block.required(),
    other_transactions: Joi.array().items(transactionIdentifier)
});

export const blockTransactionResponse = Joi.object({
    transaction: transaction.required()
});

export const mempoolResponse = Joi.object({
    transaction_identifiers: Joi.array().items(transactionIdentifier).required()
});

export const mempoolTransactionResponse = Joi.object({
    transaction: transaction.required(),
    metadata
});

export const eventsBlocksResponse = Joi.object({
    max_sequence: index.required(),
    events: Joi.array().items(Joi.object({
        sequence: index.required(),
        block_identifier: blockIdentifier.required(),
        type: Joi.string().valid('block_added', 'block_removed').required()
    })).required()
});

export const searchTransactionsResponse = Joi.object({
    transactions: Joi.array().items(Joi.object({
        block_identifier: blockIdentifier.required(),
        transaction: transaction.required()
    })).required(),
    total_count: index.required(),
    next_offset: index
});

// ---- Construction API responses ----

export const constructionDeriveResponse = Joi.object({
    address,
    account_identifier: accountIdentifier,
    metadata
}).or('address', 'account_identifier');

export const constructionPreprocessResponse = Joi.object({
    options: metadata,
    required_public_keys: Joi.array().items(accountIdentifier)
});

export const constructionMetadataResponse = Joi.object({
    metadata: metadata.required(),
    suggested_fee: Joi.array().items(amount)
});

export const constructionPayloadsResponse = Joi.object({
    unsigned_transaction: hex.required(),
    payloads: Joi.array().items(signingPayload).min(1).required()
});

export const constructionParseResponse = Joi.object({
    operations: Joi.array().items(intentOperation).required(),
    signers: Joi.array().items(Joi.string()),
    account_identifier_signers: Joi.array().items(accountIdentifier),
    metadata
});

export const constructionCombineResponse = Joi.object({
    signed_transaction: hex.required()
});

export const transactionIdentifierResponse = Joi.object({
    transaction_identifier: transactionIdentifier.required(),
    metadata
});

/** Fails the test with every schema violation listed. */
export const expectSchema = (value: unknown, schema: Joi.Schema): void => {
    const { error: validationError } = schema.validate(value, { abortEarly: false, convert: false });
    if (validationError) {
        const problems = validationError.details.map(d => `  - ${d.message} (at ${d.path.join('.') || '<root>'})`).join('\n');
        throw new Error(`Response does not match the Rosetta schema:\n${problems}\nResponse: ${JSON.stringify(value, null, 2)}`);
    }
};
