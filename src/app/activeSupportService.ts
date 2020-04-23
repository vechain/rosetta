import { GlobalEnvironment } from "./globalEnvironment";
import { ActionResult, ActionResultWithData } from "../utils/components/actionResult";
import { Framework } from "@vechain/connex-framework";
import { Driver, SimpleNet } from '@vechain/connex-driver'
const format = require('string-format');

export default class ActiveSupportServices
{
    public static async activieSupportServices(environment:GlobalEnvironment):Promise<ActionResult> {
        let result = new ActionResult();

        if(environment.config.vechainThorNodeConfig.mainnet_node_api_addr != null){
            let mainnetConnexResult = await this.instantiationConnex(environment.config.vechainThorNodeConfig.mainnet_node_api_addr,"mainnet");
            if(mainnetConnexResult.Result){
                result.Result = true;
                environment.connex = mainnetConnexResult.Data;
            }
        }

        if(environment.config.vechainThorNodeConfig.testnet_node_api_addr != null){
            let testnetConnexResult = await this.instantiationConnex(environment.config.vechainThorNodeConfig.testnet_node_api_addr,"testnet");
            if(testnetConnexResult.Result){
                result.Result = true;
                environment.testNetConnex = testnetConnexResult.Data;
            }
        }

        if(!result.Result){
            result.Message = "Can not connect any VeChainThor network";
        }

        return result;
    }

    private static async instantiationConnex(api_addr:string,network:string = "mainnet"):Promise<ActionResultWithData<Connex>>{
        let result = new ActionResultWithData<Connex>();

        try{
            let driver = await Driver.connect(new SimpleNet(api_addr));
            const connex = new Framework(driver);
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