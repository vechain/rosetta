export type Currency = {
    symbol:string,
    decimals:number,
    metadata?:any|{
        contractAddress?:string
    }
}