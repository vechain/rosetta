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
    metadata?:any
}

export type SubAccountIdentifier = {
    address:string,
    metadata?:any
}

export type SubNetworkIdentifier = {
    network:string,
    metadata?:any
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