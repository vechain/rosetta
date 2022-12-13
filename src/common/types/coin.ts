import { Amount } from "./amount";
import { CoinIdentifier } from "./identifiers";

export type Coin = {
    coin_identifier:CoinIdentifier,
    amount:Amount
}