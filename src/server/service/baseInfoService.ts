import { ActionResultWithData } from "../../utils/components/actionResult";
import { NetworkIdentifier } from "../datameta/network";
import { GlobalEnvironment } from "../../app/globalEnvironment";
import { RosettaError } from "../datameta/rosetta";

export class BaseInfoService{
    private _environmentConfig:GlobalEnvironment;

    constructor(environment:GlobalEnvironment){
        this._environmentConfig = environment;
    }

    public async getVeChainMainNetInfo():Promise<ActionResultWithData<NetworkIdentifier>>{
        let result = new ActionResultWithData<NetworkIdentifier>();

        let networkIdentifier = new NetworkIdentifier();
        networkIdentifier.blockchain = "vechainThor";
        networkIdentifier.network = "mainnet";

        result.Result = true;
        result.Data = networkIdentifier;
        return result;
    }

    public async getVeChainTestNetInfo():Promise<ActionResultWithData<NetworkIdentifier>>{
        let result = new ActionResultWithData<NetworkIdentifier>();

        let networkIdentifier = new NetworkIdentifier();
        networkIdentifier.blockchain = "vechainThor";
        networkIdentifier.network = "testNet";

        result.Result = true;
        result.Data = networkIdentifier;
        return result;
    }

    public async getNetworkList():Promise<ActionResultWithData<Array<NetworkIdentifier>>>{
        let result = new ActionResultWithData<Array<NetworkIdentifier>>();
        result.Data = new Array<NetworkIdentifier>();

        if(this._environmentConfig.connex != null){
            result.Data.push((await this.getVeChainMainNetInfo()).Data!);
            result.Result = true;
        }

        if(this._environmentConfig.testNetConnex != null){
            result.Data.push((await this.getVeChainTestNetInfo()).Data!);
            result.Result = true;
        }

        if(!result.Result){
            result.ErrorData = new RosettaError(9000,"none node can be connection",true);
        }

        return result;
    }
}