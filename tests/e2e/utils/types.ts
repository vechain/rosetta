// Shapes of the Rosetta responses the tests read fields from. The api tests
// validate full responses against the spec schemas in ./schemas; these types
// only describe what this implementation returns, so tests need no `any`.

export interface BlockIdentifier {
    index: number,
    hash: string
}

export interface TransactionIdentifier {
    hash: string
}

export interface AccountIdentifier {
    address: string
}

export interface Amount {
    value: string,
    currency: { symbol: string, decimals: number, metadata?: Record<string, unknown> }
}

/** Every operation this implementation reports carries an account and an amount. */
export interface Operation {
    operation_identifier: { index: number, network_index?: number },
    type: string,
    status?: string,
    account: AccountIdentifier,
    amount: Amount,
    metadata?: Record<string, unknown>
}

export interface Transaction {
    transaction_identifier: TransactionIdentifier,
    operations: Operation[],
    metadata?: Record<string, unknown>
}

export interface SigningPayload {
    address: string,
    account_identifier?: AccountIdentifier,
    hex_bytes: string,
    signature_type: string
}

export interface ErrorResponse {
    code: number,
    message: string,
    description?: string,
    retriable: boolean,
    details?: unknown
}

export interface NetworkListResponse {
    network_identifiers: Array<{ blockchain: string, network: string }>
}

export interface NetworkOptionsResponse {
    version: { rosetta_version: string, node_version: string },
    allow: { errors: ErrorResponse[] }
}

export interface NetworkStatusResponse {
    current_block_identifier: BlockIdentifier,
    current_block_timestamp: number,
    genesis_block_identifier: BlockIdentifier,
    sync_status: { current_index: number }
}

export interface AccountBalanceResponse {
    block_identifier: BlockIdentifier,
    balances: Amount[]
}

export interface BlockResponse {
    block: {
        block_identifier: BlockIdentifier,
        parent_block_identifier: BlockIdentifier,
        timestamp: number,
        transactions: Transaction[]
    },
    other_transactions?: TransactionIdentifier[]
}

export interface BlockTransactionResponse {
    transaction: Transaction
}

export interface MempoolResponse {
    transaction_identifiers: TransactionIdentifier[]
}

export interface MempoolTransactionResponse {
    transaction: Transaction
}

export interface EventsBlocksResponse {
    max_sequence: number,
    events: Array<{ sequence: number, block_identifier: BlockIdentifier, type: string }>
}

export interface SearchTransactionsResponse {
    transactions: Array<{ block_identifier: BlockIdentifier, transaction: Transaction }>,
    total_count: number
}

export interface ConstructionDeriveResponse {
    address: string,
    account_identifier: AccountIdentifier
}

export interface ConstructionPreprocessResponse {
    options: { clauses: Array<{ to: string | null, value: string | number, data: string }> },
    required_public_keys: AccountIdentifier[]
}

export interface ConstructionMetadataResponse {
    metadata: {
        transactionType: string,
        blockRef: string,
        chainTag: number,
        gas: number,
        // legacy transactions
        gasPriceCoef?: number,
        // dynamic fee transactions
        maxFeePerGas?: string,
        maxPriorityFeePerGas?: string
    },
    suggested_fee: Amount[]
}

export interface ConstructionPayloadsResponse {
    unsigned_transaction: string,
    payloads: SigningPayload[]
}

export interface ConstructionParseResponse {
    operations: Operation[],
    account_identifier_signers?: AccountIdentifier[]
}

export interface ConstructionCombineResponse {
    signed_transaction: string
}

export interface TransactionIdentifierResponse {
    transaction_identifier: TransactionIdentifier
}

/** Response type of each endpoint, so `rosetta.call(endpoint)` is typed by its path. */
export interface RosettaResponses {
    '/network/list': NetworkListResponse,
    '/network/options': NetworkOptionsResponse,
    '/network/status': NetworkStatusResponse,
    '/account/balance': AccountBalanceResponse,
    '/block': BlockResponse,
    '/block/transaction': BlockTransactionResponse,
    '/mempool': MempoolResponse,
    '/mempool/transaction': MempoolTransactionResponse,
    '/events/blocks': EventsBlocksResponse,
    '/search/transactions': SearchTransactionsResponse,
    '/construction/derive': ConstructionDeriveResponse,
    '/construction/preprocess': ConstructionPreprocessResponse,
    '/construction/metadata': ConstructionMetadataResponse,
    '/construction/payloads': ConstructionPayloadsResponse,
    '/construction/parse': ConstructionParseResponse,
    '/construction/combine': ConstructionCombineResponse,
    '/construction/hash': TransactionIdentifierResponse,
    '/construction/submit': TransactionIdentifierResponse
}
