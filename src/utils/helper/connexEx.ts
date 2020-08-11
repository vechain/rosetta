import { Framework } from "@vechain/connex-framework";
import { BigNumberEx } from "./bigNumberEx";
import { Net, Wallet, Driver, SimpleNet } from "@vechain/connex-driver";
import { NetworkType } from "../../server/datameta/networkType";

export default class ConnexEx extends Framework
{
    public static async Create(networkType:NetworkType,net: Net,wallet?: Wallet):Promise<ConnexEx>{
        let driver = await Driver.connect(net,wallet);
        let connexEx = new ConnexEx(driver,networkType);
        connexEx._baseUrl = net.baseURL;
        connexEx._chainTag = new BigNumberEx("0x" + connexEx.thor.genesis.id.substring(64)).toNumber();
        return connexEx;
    }

    public NodeVersion:string = "";
    
    public get baseUrl() : string {
        return this._baseUrl;
    }

    public get blockRef() : string {
        return this.thor.status.head.id.substring(0,18);
    }

    public get chainTag():number {
        return this._chainTag;
    }

    public get NetWorkType():NetworkType {
        return this._networkType;
    }

    public get Driver() : Driver{
        return this._driver;
    }

    private constructor(driver:Driver,networkType:NetworkType){
        super(driver);
        this._driver = driver;
        this._networkType = networkType;
    }

    private _baseUrl:string = "";
    private _chainTag:number = 0;
    private _networkType:NetworkType;
    private _driver:Driver;
}