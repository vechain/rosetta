import { TransactionIdentifier } from "./identifiers"
import { Operation } from "./operation"
import { RelatedTransaction } from "./relatedTransaction"

export type Transaction = {
    transaction_identifier:TransactionIdentifier,
    operations:Array<Operation>,
    related_transactions?:Array<RelatedTransaction>,
    metadata?:any
}

export type TxPoolTransaction = {
    id: string,
    type: number,
    chainTag: number,
    blockRef: string,
    expiration: number,
    clauses: {
        to: string,
        value: string,
        data: string,
    }[],
    gas: number,
    maxFeePerGas: string,
    maxPriorityFeePerGas: string,
    origin: string,
    delegator: string,
    nonce: string,
    dependsOn: string,
    size: number,
    meta: string
}