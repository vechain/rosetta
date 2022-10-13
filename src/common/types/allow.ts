import { Currency } from "./currency"
import { RosettaError } from "./error"

export type Allow = {
    operation_statuses:Array<OperationStatus>,
    operation_types:Array<string>,
    errors:Array<RosettaError>,
    historical_balance_lookup:boolean,
    timestamp_start_index?:number,
    call_methods:Array<string>,
    balance_exemptions:Array<BalanceExemption>,
    mempool_coins:boolean,
    block_hash_case?:Case,
    transaction_hash_case?:Case
}

export type OperationStatus = {
    status:string,
    successful:boolean
}

export type BalanceExemption = {
    sub_account_address?:string,
    currency?:Currency,
    exemption_type?:ExemptionType
}

export enum ExemptionType {
    greater_or_equal = 'greater_or_equal',
    less_or_equal = 'less_or_equal',
    dynamic = 'dynamic'
}

export enum Case {
    upper_case = 'upper_case',
    lower_case = 'lower_case',
    case_sensitive = 'case_sensitive',
    null = 'null'
}