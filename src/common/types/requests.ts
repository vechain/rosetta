import type { Transaction as VeTransaction } from "thor-devkit";
import { Amount } from "./amount";
import { Currency } from "./currency";
import { AccountIdentifier, NetworkIdentifier, PartialBlockIdentifier, TransactionIdentifier } from "./identifiers";
import { Operation } from "./operation";
import { PublicKey, Signature } from "./signature";

// Request bodies of the Rosetta endpoints, as seen by the handlers after the
// route's validation middlewares (RequestInfoVerifyMiddleware + Joi) have run.
// https://docs.cdp.coinbase.com/mesh/reference/api-reference

export type MetadataRequest = {
    metadata?: Record<string, unknown>
}

export type NetworkRequest = {
    network_identifier: NetworkIdentifier,
    metadata?: Record<string, unknown>
}

export type AccountBalanceRequest = NetworkRequest & {
    account_identifier: AccountIdentifier,
    block_identifier?: PartialBlockIdentifier,
    currencies?: Array<Currency>
}

// block_identifier may be absent: checkBlock only validates it when present,
// and the handlers answer with error 24 in that case.
export type BlockRequest = NetworkRequest & {
    block_identifier?: PartialBlockIdentifier
}

export type BlockTransactionRequest = NetworkRequest & {
    block_identifier?: PartialBlockIdentifier,
    transaction_identifier: TransactionIdentifier
}

export type MempoolRequest = NetworkRequest & {
    metadata?: {
        origin?: string
    }
}

export type TransactionIdentifierRequest = NetworkRequest & {
    transaction_identifier: TransactionIdentifier
}

export type EventsBlocksRequest = NetworkRequest & {
    offset?: number,
    limit?: number
}

export type TransactionType = 'legacy' | 'dynamic';

export type ConstructionDeriveRequest = NetworkRequest & {
    public_key: PublicKey
}

/** An operation of a construction request, with account and amount required by validation. */
export type ConstructionOperation = Operation & {
    account: AccountIdentifier,
    amount: Amount
}

export type ConstructionPreprocessRequest = NetworkRequest & {
    operations: Array<ConstructionOperation>,
    metadata?: {
        fee_delegator_account?: string
    }
}

export type ConstructionMetadataRequest = NetworkRequest & {
    options: {
        transactionType: TransactionType,
        clauses?: Array<VeTransaction.Clause>
    }
}

export type ConstructionPayloadsMetadata = {
    transactionType?: TransactionType,
    blockRef: string,
    nonce?: string,
    chainTag: number,
    gas: number,
    gasPriceCoef?: number,
    maxFeePerGas?: string,
    maxPriorityFeePerGas?: string,
    fee_delegator_account?: string
}

export type ConstructionPayloadsRequest = NetworkRequest & {
    operations: Array<ConstructionOperation>,
    public_keys: Array<PublicKey>,
    metadata: ConstructionPayloadsMetadata
}

export type ConstructionParseRequest = NetworkRequest & {
    signed: boolean,
    transaction: string
}

export type ConstructionCombineRequest = NetworkRequest & {
    unsigned_transaction: string,
    signatures: Array<Signature>
}

export type SignedTransactionRequest = NetworkRequest & {
    signed_transaction: string
}
