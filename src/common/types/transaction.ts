import { TransactionIdentifier } from "./identifiers"
import { Operation } from "./operation"
import { RelatedTransaction } from "./relatedTransaction"

export type Transaction = {
    transaction_identifier:TransactionIdentifier,
    operations:Array<Operation>,
    related_transactions?:Array<RelatedTransaction>,
    metadata?:any
}