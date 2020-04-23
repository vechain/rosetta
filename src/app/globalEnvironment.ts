import { BaseGlobalEnvironment, iBaseConfig } from '../utils/components/baseGlobalEnvironment';
import { iLogHelperConfig, LogHelper } from '../utils/helper/logHelper';
import { Framework } from '@vechain/connex-framework'

export class GlobalEnvironment extends BaseGlobalEnvironment{
    
    public connex:Connex | undefined;
    public testNetConnex: Connex | undefined;
    public logHelper:LogHelper = new LogHelper();
    
    constructor(config:iConfig){
        super(config);
        this.initLogHelper();
    }

    private initLogHelper(){
        this.logHelper.init(this.config);
    }
}

export interface iConfig extends iBaseConfig,iLogHelperConfig
{
    vechainThorNodeConfig:{
        mainnet_node_api_addr:String;
        testnet_node_api_addr:String;
    }

    rosettaConfig:{
        version:string;
    }
}