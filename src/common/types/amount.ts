import { Currency } from "./currency"

export type Amount = {
    value:string,
    currency:Currency,
    metadata?:any
}