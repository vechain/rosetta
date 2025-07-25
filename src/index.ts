import Axios from "axios";
import Koa from 'koa';
import bodyParser from "koa-bodyparser";
import Router from "koa-router";
import path from "path";
import { Currency } from "./common/types/currency";
import { Account } from "./controllers/account";
import { Block } from "./controllers/block";
import { Call } from "./controllers/call";
import { Construction } from "./controllers/construction";
import { Events } from "./controllers/events";
import { Mempool } from "./controllers/mempool";
import { Network } from "./controllers/network";
import { Search } from "./controllers/search";
import { URLCodeMiddleware } from "./middlewares/uricodeMiddleware";
import ConnexPro from "./utils/connexPro";
import { Logger } from "./utils/logger";

process.setMaxListeners(50);

const configPath = path.join(__dirname, "../config/config.json");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const config = require(configPath);


export const VETCurrency:Currency = {
    symbol:'VET',
    decimals:18,
    metadata:{}
}

export const VTHOCurrency:Currency = {
    symbol:'VTHO',
    decimals:18,
    metadata:{
        contractAddress:'0x0000000000000000000000000000456e65726779'
    }
}

class ApiServer {
    public async run(){
        this.initConfig();
        this.initTokenList();
        if(this.env.config.mode == 'online'){
            await this.initConnex();
            this.env.config.node_version = this.env.connex.nodeVersion;
        } else {
            this.env.config.apiVersion = "";
            this.env.config.nodeVersion = "";

            switch(this.env.config.network as string){
                case "main":
                    this.env.config.chainTag = 0x4a;
                    break;
                case "test":
                    this.env.config.chainTag = 0x27;
                    break;
                default:
                    break;
            }
        }
        this.runService();
    }

    private initConfig(){
        this.env.config = config;
        this.env.config.mode = (process.env['MODE'] || 'online') as string;
        this.env.config.network = (process.env['NETWORK'] || 'custom') as string;
        this.env.config.nodeApi = (process.env['NODEURL'] || '') as string;
        this.env.config.serviceName = 'VeChain Rosetta API';
        this.env.logger = new Logger(this.env);
    }

    private initTokenList() {
        this.env.config.tokenlist = new Array<Currency>();
        this.env.config.tokenlist.push(VTHOCurrency);
        // const tokenListConfig = (process.env['TOKENLIST'] ||  path.join(__dirname,'../config/tokelist.json')) as string;
        // if(FileIO.existsSync(tokenListConfig)){
        //     const tokenlist = require(tokenListConfig);
        //     if(tokenlist[`${this.env.config.network}`]?.vip180_list != undefined){
        //         this.env.config.tokenlist = (this.env.config.tokenlist as Array<Token>).concat(tokenlist[`${this.env.config.network}`].vip180_list);
        //     }
        // }
    }

    private async initConnex() {
        try {
            const connex = await ConnexPro.instance(this.env.config.nodeApi);
            const apiVersion = await this.getApiVersion();
            this.env.config.apiVersion = apiVersion;
            this.env.config.nodeVersion = this.env.config.node_version || apiVersion;
            connex.apiVersion = apiVersion;
            connex.nodeVersion = this.env.config.nodeVersion;
            this.env.config.chainTag = connex.chainTag;
            this.env.connex = connex;
            if(connex.network != this.env.config.network){
                console.error(`The node ${connex.network} is not ${this.env.config.network} network.`);
                process.exit();
            }
        } catch (error) {
            console.error(`Connect vechain node ${this.env.config.nodeApi} failed.`, error);
            process.exit();
        }
    }

    private runService() {
        const port = Number(this.env.config.port || 8000);
        const root = this.initRouter();
        const koaServer = new Koa();
        koaServer.use(async (ctx,next) => { await URLCodeMiddleware.URLDecoder(ctx,next);});
        koaServer.use(bodyParser());
        koaServer.use(async (ctx,next) => { await (this.env.logger as Logger).httpLoggerMiddleware(ctx,next);})
        koaServer.use(root.routes()).use(root.allowedMethods());
        koaServer.listen(port);
        console.info(`
            ******************** VeChain Rosetta API Server ********************
            |   Api               |   localhost:${port}
            |   Rosetta Version   |   ${this.env.config.rosetta_version}
            |   Mode              |   ${this.env.config.mode}
            |   Node URL          |   ${this.env.config.nodeApi}
            |   Node Version      |   ${this.env.config.nodeVersion}
            |   Network           |   ${this.env.config.network}
            *******************************************************************
            `);
        
    }

    private initRouter():Router{
        const router = new Router();
        const account = new Account(this.env);
        const block = new Block(this.env);
        const call = new Call(this.env);
        const construction = new Construction(this.env);
        const events = new Events(this.env);
        const mempool = new Mempool(this.env);
        const network = new Network(this.env);
        const search = new Search(this.env);

        router.use(account.routes()).use(account.allowedMethods());
        router.use(block.routes()).use(block.allowedMethods());
        router.use(call.routes()).use(call.allowedMethods());
        router.use(construction.routes()).use(construction.allowedMethods());
        router.use(events.routes()).use(events.allowedMethods());
        router.use(mempool.routes()).use(mempool.allowedMethods());
        router.use(network.routes()).use(network.allowedMethods());
        router.use(search.routes()).use(search.allowedMethods());

        return router;
    }

    private async getApiVersion():Promise<string>{
        const url = this.env.config.nodeApi + '/blocks/0';
        const response = await Axios({url:url,method:'Get',responseType:'json'});
        return response.headers['x-thorest-ver'] as string;
    }

    private env:any = {};
}

(new ApiServer()).run();