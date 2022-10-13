import { BlockIdentifier } from "./identifiers"
import { Transaction } from "./transaction"

export type Block = {
    block_identifier:BlockIdentifier,
    parent_block_identifier:BlockIdentifier,
    timestamp:number,
    transactions:Transaction,
    metadata?:any
}

export type BlockEvent = {
    sequence:number,
    block_identifier:BlockIdentifier,
    type:BlockEventType
}

export enum BlockEventType {
    block_added = 'block_added',
    block_removed = 'block_removed'
}