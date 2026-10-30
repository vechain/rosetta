export type Currency = {
    symbol:string,
    decimals:number,
    metadata?:CurrencyMetadata
}

export type CurrencyMetadata = Record<string, unknown> & {
    contractAddress?:string
}

/** A VIP180 token currency: always carries its contract address. */
export type TokenCurrency = Currency & {
    metadata:CurrencyMetadata & {
        contractAddress:string
    }
}
