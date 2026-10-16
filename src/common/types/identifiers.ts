export type PartialBlockIdentifier = {
    index?:number,
    hash?:string
}

export type BlockIdentifier = {
    index:number,
    hash:string
}

export type NetworkIdentifier = {
    blockchain:string,
    network:string,
    sub_network_identifier?:SubNetworkIdentifier
}

export type AccountIdentifier = {
    address:string,
    sub_account?:SubAccountIdentifier,
    metadata?:Record<string, unknown>
}

export type SubAccountIdentifier = {
    address:string,
    metadata?:Record<string, unknown>
}

export type SubNetworkIdentifier = {
    network:string,
    metadata?:Record<string, unknown>
}

export type CoinIdentifier = {
    identifier:string
}

export type OperationIdentifier = {
    index:number,
    network_index?:number
}

export type TransactionIdentifier = {
    hash:string
}