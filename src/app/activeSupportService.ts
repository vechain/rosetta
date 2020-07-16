import { GlobalEnvironment, iConfig } from "./globalEnvironment";
import { ActionResult, ActionResultWithData } from "../utils/components/actionResult";
import { SimpleNet } from '@vechain/connex-driver'
import ConnexEx from "../utils/helper/connexEx";
import { NetworkType } from "../server/datameta/networkType";
const format = require('string-format');

export default class ActiveSupportServices
{
    public static async activieSupportServices(environment:GlobalEnvironment):Promise<ActionResult> {
        let result = new ActionResult();

        if(environment.config.netconfig.mainnet.node_api != null){
            let mainnetConnexResult = await this._instantiationConnex(environment.config.netconfig.mainnet.node_api,NetworkType.MainNet);
            if(mainnetConnexResult.Result && mainnetConnexResult.Data){
                result.Result = true;
                environment.mainNetconnex = mainnetConnexResult.Data;
                environment.mainNetconnex.nodeVersion = environment.config.netconfig.mainnet.node_version;
            }
            else
            {
                result.Result = false;
                result.Message = "Can not connect mainnet VeChainThor network";
                return result;
            }
        }

        if(environment.config.netconfig.testnet.node_api != null){
            let testnetConnexResult = await this._instantiationConnex(environment.config.netconfig.testnet.node_api,NetworkType.TestNet);
            if(testnetConnexResult.Result && testnetConnexResult.Data){
                result.Result = true;
                environment.testNetConnex = testnetConnexResult.Data;
                environment.testNetConnex.nodeVersion = environment.config.netconfig.testnet.node_version;
            }
            else
            {
                result.Result = false;
                result.Message = "Can not connect testnet VeChainThor network";
                return result;
            }
        }

        if(!result.Result){
            result.Message = "Can not connect any VeChainThor network";
        }

        return result;
    }

    private static async _instantiationConnex(api_addr:string,network:NetworkType):Promise<ActionResultWithData<ConnexEx>>{
        let result = new ActionResultWithData<ConnexEx>();

        try{
            let connex = await ConnexEx.Create(network,new SimpleNet(api_addr))
            let genesisBlockID = connex.thor.genesis.id;

            if(network == "mainnet" && genesisBlockID == "0x00000000851caf3cfdb6e899cf5958bfb1ac3413d346d43539627e6be7ec1b4a"){
                result.Data = connex;
                result.Result = true;
            }
            else if(network == "testnet" && genesisBlockID == "0x000000000b2bce3c70bc649a02749e8687721b09ed2e15997f466536b20bb127")
            {
                result.Data = connex;
                result.Result = true;
            }
            else{
                result.Result = false;
                result.Message = format("the node is not {network} node.",{network:network});
            }

        }
        catch{
            result.Result = false;
            result.Message = format("{api_addr} could not be connected",{api_addr:api_addr});
        }

        return result;
    }
}