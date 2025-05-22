import axios from 'axios';
import Joi from 'joi';
import Router from "koa-router";
import { getError } from '../common/errors';
import { TxPoolTransaction } from '../common/types/transaction';
import { ConvertJSONResponseMiddleware } from '../middlewares/convertJSONResponseMiddleware';
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

    private async getTransactions(origin?:string, expanded: boolean = false):Promise<TxPoolTransaction[] | string[]> {
        const url = this.connex.baseUrl + '/node/txpool' + 
            (expanded ? '?expanded=true' : '') + 
            (origin ? `${expanded ? '&' : '?'}origin=${origin}` : '');
        const response = await axios.get(url);
        const transactions = expanded ? response.data as TxPoolTransaction[] : response.data as string[];

        return transactions;
    }

    private checkMetadata(ctx:Router.IRouterContext):boolean{
        const schema = Joi.object({
            metadata: Joi.object({
                origin: Joi.string().lowercase().length(42).regex(/^(-0x|0x)?[0-9a-f]*$/)
            }).optional()
        }).unknown(true);
        const verify = schema.validate(ctx.request.body);
        if(verify.error == undefined){
            return true;
        } else {
            ConvertJSONResponseMiddleware.KnowErrorJSONResponse(ctx,getError(16,undefined,{
                error:verify.error
            }));
            return false;
        }
    }

    private async getTxPoolTransactions(ctx:Router.IRouterContext,next: () => Promise<any>){
        if(this.checkMetadata(ctx)){
            const txPool = await this.getTransactions(ctx.request.body.metadata?.origin) as string[];
            ConvertJSONResponseMiddleware.BodyDataToJSONResponse(ctx,{
                transaction_identifiers:txPool.map((tx) => {
                    return {
                        hash:tx
                    }
                })
            });
        }
        await next();
    }

    private async getTxPoolTransaction(ctx:Router.IRouterContext,next: () => Promise<any>){
        if(this.verifyMiddleware.checkTransactionIdentifier(ctx)){
            const txPool = await this.getTransactions(undefined,true) as TxPoolTransaction[];
            const tx = txPool.find((tx) => {
                return tx.id == ctx.request.body.transaction_identifier.hash;
            });
            if(tx == undefined){
                ConvertJSONResponseMiddleware.KnowErrorJSONResponse(ctx,getError(25,undefined,{
                    error: 'Transaction not found in mempool'
                }));
            }
            //TODO: clause parsing into operations
            ConvertJSONResponseMiddleware.BodyDataToJSONResponse(ctx,{
                transaction:tx
            });
        }
        await next();
    }
}