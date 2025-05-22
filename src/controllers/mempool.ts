import axios from 'axios';
import Router from "koa-router";
import { TxPoolTransaction } from '../common/types/transaction';
import { RequestInfoVerifyMiddleware } from '../middlewares/requestInfoVerifyMiddleware';
import ConnexPro from '../utils/connexPro';


export class Mempool extends Router {
    private readonly env:any;
    private readonly connex:ConnexPro;
    private readonly verifyMiddleware:RequestInfoVerifyMiddleware;


    constructor(env:any){
        super();
        this.env = env;
        this.connex = this.env.connex;
        this.verifyMiddleware = new RequestInfoVerifyMiddleware(this.env);
        this.post('/mempool',
            async (ctx,next) => { await this.verifyMiddleware.checkNetwork(ctx,next);},
            async (ctx,next) => { await this.verifyMiddleware.checkRunMode(ctx,next);},
            async (ctx,next) => { await this.verifyMiddleware.checkModeNetwork(ctx,next);},
            async (ctx,next) => { await this.getTxPoolTransactions(ctx,next);}
        );
        this.post('/mempool/transaction', 
            async (ctx,next) => { await this.verifyMiddleware.checkNetwork(ctx,next);},
            async (ctx,next) => { await this.verifyMiddleware.checkRunMode(ctx,next);},
            async (ctx,next) => { await this.verifyMiddleware.checkModeNetwork(ctx,next);},
            async (ctx,next) => { await this.getTxPoolTransaction(ctx,next);}
        );
    }

    private async getTransactions(origin:string):Promise<TxPoolTransaction[]> {
        const response = await axios.get(this.connex.baseUrl + '/node/txpool?expanded=true&origin=' + origin);
        const transactions = response.data as TxPoolTransaction[];

        return transactions;
    }

    private async getTxPoolTransactions(ctx:Router.IRouterContext,next: () => Promise<any>){
        const txPool = await this.getTransactions(ctx.request.body.metadata.origin);
        ctx.body = txPool;
        //TODO: modify data to match the response schema
        await next();
    }

    private async getTxPoolTransaction(ctx:Router.IRouterContext,next: () => Promise<any>){
        const txPool = await this.getTransactions(ctx.request.body.metadata.origin);
        ctx.body = txPool;
        //TODO: implement the logic by id
        await next();
    }
}