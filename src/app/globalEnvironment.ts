import { BaseGlobalEnvironment, iBaseConfig } from '../utils/components/baseGlobalEnvironment';
import { iLogHelperConfig, LogHelper } from '../utils/helper/logHelper';
import ConnexEx from '../utils/helper/connexEx';
import { NetworkType } from '../server/datameta/networkType';
import { array } from 'joi';

export class GlobalEnvironment extends BaseGlobalEnvironment{
    
    public mainNetconnex:ConnexEx | undefined;
    public testNetConnex: ConnexEx | undefined;
    public logHelper:LogHelper = new LogHelper();
    public mainNet180List:Array<VIP180Config> = new Array();
    public testNet180List:Array<VIP180Config> = new Array();
    
    constructor(config:any){
        super(config);
        this._initLogHelper(config);
        this._addVIP180Token(config);
        config.rosetta_version = "1.3.1"
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

    public getVIP180TokenList(type:NetworkType):Array<VIP180Config>
    {
        switch(type){
            case NetworkType.MainNet:
                return this.mainNet180List;
            case NetworkType.TestNet:
                return this.mainNet180List;
            default:
                return new Array<VIP180Config>();
        }
    }

    private _initLogHelper(config:any){
        this.logHelper.init(config);
    }

    private _addVTHOToken()
    {
        this.mainNet180List.push(new VIP180Config("VeThor","0x0000000000000000000000000000456e65726779","VTHO",18));
        this.testNet180List.push(new VIP180Config("VeThor","0x0000000000000000000000000000456e65726779","VTHO",18));
    }

    private _addVIP180Token(config:any)
    {
        this._addVTHOToken();
        if(config.netconfig.mainnet.vip180_list != null && config.netconfig.mainnet.vip180_list as Array<any>)
        {
            for(var item of (config.netconfig.mainnet.vip180_list as Array<any>))
            {
                this.mainNet180List.push(new VIP180Config(item.name,item.address,item.symbol,item.decimals));
            }
        }

        if(config.netconfig.testnet.vip180_list != null && config.netconfig.testnet.vip180_list as Array<any>)
        {
            for(var item of (config.netconfig.testnet.vip180_list as Array<any>))
            {
                this.mainNet180List.push(new VIP180Config(item.name,item.address,item.symbol,item.decimals));
            }
        }
    }
}

export interface iConfig extends iBaseConfig,iLogHelperConfig
{
    port:number;
    confirm_num:number;
    netconfig:{
        mainnet:NetConfig,
        testnet:NetConfig
    }
    rosetta_version:string
}

export class VIP180Config
{
    public name:string = "";
    public address:string = "";
    public symbol:string = "";
    public decimals:number = 0;
    public metadata:any | undefined;

    constructor(name:string,address:string,symbol:string,decimals:number,metadata?:any){
        this.name = name;
        this.address = address;
        this.symbol = symbol;
        this.decimals = decimals;
        this.metadata = metadata;
    }
}

export class NetConfig
{
    public node_api:string = "";
    public node_version:string = "";
    public vip180_list:Array<VIP180Config> = new Array<VIP180Config>()
}