import { Framework } from "@vechain/connex-framework";
import { BigNumberEx } from "./bigNumberEx";
import { Net, Wallet, Driver, SimpleNet } from "@vechain/connex-driver";

export default class ConnexEx extends Framework
{
    public static async Create(net: Net,wallet?: Wallet):Promise<ConnexEx>{
        let driver = await Driver.connect(net,wallet);
        let connexEx = new ConnexEx(driver);
        connexEx._baseUrl = net.baseURL;
        connexEx._chainTag = new BigNumberEx("0x" + connexEx.thor.genesis.id.substring(64)).toNumber();
        return connexEx;
    }

    public nodeVersion:string = "";
    
    public get baseUrl() : string {
        return this._baseUrl;
    }

    public get blockRef() : string {
        return this.thor.status.head.id.substring(0,18);
    }

    public get chainTag():number {
        return this._chainTag;
    }

    private constructor(driver:Driver){
        super(driver);
    }

    private _baseUrl:string = "";
    private _nodeVersion:string = "";
    private _chainTag:number = 0;
}