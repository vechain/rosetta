import type ConnexPro from "../../utils/connexPro";
import type { Logger } from "../../utils/logger";
import { TokenCurrency } from "./currency";

export type NetworkName = 'main' | 'test' | 'solo' | 'custom';

export type Config = {
    // loaded from config/config.json
    env: string,
    logLevel: string,
    logEnvLevel: string,
    port: number,
    confirm_num: number,
    rosetta_version: string,
    node_version: string,
    expiration: number,
    baseGasPrice: number,
    chainTag: number,
    initialBaseFee: number,
    mode: 'online' | 'offline',
    // populated at startup
    network: NetworkName,
    nodeApi: string,
    serviceName: string,
    tokenlist: Array<TokenCurrency>,
    apiVersion: string,
    nodeVersion: string
}

export type Env = {
    config: Config,
    connex: ConnexPro,
    logger: Logger
}
