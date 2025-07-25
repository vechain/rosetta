import { Amount } from "./amount"
import { CoinChange } from "./coinChange"
import { AccountIdentifier, OperationIdentifier } from "./identifiers"

export type Operation = {
    operation_identifier:OperationIdentifier,
    related_operations?:Array<OperationIdentifier>,
    type:string|OperationType,
    status?:string|OperationStatus,
    account?:AccountIdentifier,
    amount?:Amount,
    coin_change?:CoinChange,
    metadata?:any
}

export enum OperationType {
    None = 'None',
    Transfer = 'Transfer',
    Fee = 'Fee',
    FeeDelegation = 'FeeDelegation',
    Call = 'Call'
}

export enum OperationStatus {
    None = 'None',
    Succeeded = 'Succeeded',
    Reverted = 'Reverted'
}