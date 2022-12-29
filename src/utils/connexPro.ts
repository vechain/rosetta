import { Framework } from "@vechain/connex-framework";
import { Wallet, Driver, SimpleNet } from "@vechain/connex-driver";

export default class ConnexPro extends Framework
{
    public static async instance(baseUrl:string,wallet?: Wallet,options?:{timeout?: number, wsTimeout?: number}):Promise<ConnexPro> {
        const driver = await Driver.connect(new SimpleNet(baseUrl,options?.timeout,options?.wsTimeout),wallet);
        const instance = new ConnexPro(driver);
        instance._baseUrl = baseUrl;
        instance._chainTag = Number("0x" + instance.thor.genesis.id.substring(64));
        instance._driver = driver;
        if(instance._chainTag == 0x4a){
            instance._network = 'main';
        } else if(instance._chainTag == 0x27){
            instance._network = 'test';
        }
        return instance;
    }

    public nodeVersion:string = '';
    
    public apiVersion:string = '';
    
    public get blockRef():string{
        return this.thor.status.head.id.substring(0,18);
    }

    private constructor(driver:Driver){
        super(driver);
        this._driver = driver;
    }

    public get baseUrl():string {
        return this._baseUrl;
    }

    public get chainTag():number {
        return this._chainTag;
    }

    public get driver():Driver {
        return this._driver;
    }

    public get network():'main'|'test'|'custom'{
        return this._network;
    }

    protected _baseUrl:string = '';
    protected _chainTag:number = 0;
    protected _driver:Driver;
    protected _network:'main'|'test'|'custom' = 'custom';
}