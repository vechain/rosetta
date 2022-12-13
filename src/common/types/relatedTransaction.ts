import { NetworkIdentifier, TransactionIdentifier } from "./identifiers"

export type RelatedTransaction = {
    network_identifier?:NetworkIdentifier,
    transaction_identifier:TransactionIdentifier,
    direction:Direction
}

export enum Direction {
    forward = 'forward',
    backward = 'backward'
}