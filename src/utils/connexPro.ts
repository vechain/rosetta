import { Driver, Net, SimpleNet, Wallet } from "@vechain/connex-driver";
import { Framework } from "@vechain/connex-framework";
import { currentNodeHeaders, withNodeHeaders } from "./forwardHeaders";
import { HeaderWebSocketReader } from "./headerWebSocketReader";

/** SimpleNet that adds the current node headers (static and forwarded) to each HTTP call and websocket. */
export class ForwardingNet extends SimpleNet {
    constructor(baseURL: string, timeout?: number, private readonly wsReadTimeout = 30 * 1000) {
        super(baseURL, timeout, wsReadTimeout);
    }

    public http(method: 'GET' | 'POST', path: string, params?: Net.Params): Promise<any> { // eslint-disable-line @typescript-eslint/no-explicit-any
        const headers = withNodeHeaders(params?.headers);
        return super.http(method, path, headers ? { ...params, headers } : params);
    }

    public openWebSocketReader(path: string): Net.WebSocketReader {
        const headers = currentNodeHeaders();
        if (Object.keys(headers).length === 0) {
            return super.openWebSocketReader(path);
        }
        const url = new URL(path, this.baseURL).toString()
            .replace(/^http:/i, 'ws:')
            .replace(/^https:/i, 'wss:');
        return new HeaderWebSocketReader(url, headers, this.wsReadTimeout);
    }
}

export default class ConnexPro extends Framework
{
    public static async instance(baseUrl:string,wallet?: Wallet,options?:{timeout?: number, wsTimeout?: number}):Promise<ConnexPro> {
        const driver = await Driver.connect(new ForwardingNet(baseUrl,options?.timeout,options?.wsTimeout),wallet);
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

    public get network():'main'|'test'|'solo'|'custom'{
        return this._network;
    }

    protected _baseUrl:string = '';
    protected _chainTag:number = 0;
    protected _driver:Driver;
    protected _network:'main'|'test'|'solo'|'custom' = 'custom';
}