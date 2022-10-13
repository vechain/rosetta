import { CoinIdentifier } from "./identifiers"

export type CoinChange = {
    coin_identifier:CoinIdentifier,
    coin_action:CoinAction
}

export enum CoinAction {
    coin_created = 'coin_created',
    coin_spent = 'coin_spent'
}