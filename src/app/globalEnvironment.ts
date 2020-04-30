import { BaseGlobalEnvironment, iBaseConfig } from '../utils/components/baseGlobalEnvironment';
import { iLogHelperConfig, LogHelper } from '../utils/helper/logHelper';
import ConnexEx from '../utils/helper/connexEx';
import { NetworkType } from '../server/datameta/networkType';

export class GlobalEnvironment extends BaseGlobalEnvironment{
    
    public mainNetconnex:ConnexEx | undefined;
    public testNetConnex: ConnexEx | undefined;
    public logHelper:LogHelper = new LogHelper();
    
    constructor(config:iConfig){
        super(config);
        this._initLogHelper();
    }

    public getConnex(type:NetworkType):ConnexEx | undefined{
        switch(type){
            case NetworkType.MainNet:
                return this.mainNetconnex;
            case NetworkType.TestNet:
                return this.testNetConnex;
            default:
                return undefined;
        }
    }

    private _initLogHelper(){
        this.logHelper.init(this.config);
    }
}

export interface iConfig extends iBaseConfig,iLogHelperConfig
{
    vechainThorNodeConfig:{
        mainnet_node_api_addr:string;
        mainnet_node_version:string;
        testnet_node_api_addr:string;
        testnet_node_version:string;
    }

    rosettaConfig:{
        version:string;
    }
}