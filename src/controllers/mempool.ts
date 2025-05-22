import Router from "koa-router";
import { RequestInfoVerifyMiddleware } from '../middlewares/requestInfoVerifyMiddleware';
import ConnexPro from '../utils/connexPro';
import axios from 'axios';

type Transaction = {
    id: string,
    type: number,
    chainTag: number,
    blockRef: string,
    expiration: number,
    clauses: {
        to: string,
        value: string,
        data: string,
    }[],
    gas: number,
    maxFeePerGas: string,
    maxPriorityFeePerGas: string,
    origin: string,
    delegator: string,
    nonce: string,
    dependsOn: string,
    size: number,
    meta: string
}
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

    private async getTransactions(origin:string):Promise<Transaction[]> {
        const response = await axios.get(this.connex.baseUrl + '/node/txpool?expanded=true&origin=' + origin);
        const transactions = response.data as Transaction[];

        return transactions;
    }

    private async getTxPoolTransactions(ctx:Router.IRouterContext,next: () => Promise<any>){
        const txPool = await this.getTransactions(ctx.request.body.origin);
        ctx.body = txPool;
        //TODO: modify data to match the response schema
        await next();
    }

    private async getTxPoolTransaction(ctx:Router.IRouterContext,next: () => Promise<any>){
        const txPool = await this.getTransactions(ctx.request.body.origin);
        ctx.body = txPool;
        //TODO: implement the logic by id
        await next();
    }
}