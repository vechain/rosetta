import axios from 'axios';
import Joi from 'joi';
import Router from "koa-router";
import { getError } from '../common/errors';
import { TransactionConverter } from '../common/transConverter';
import { ConvertJSONResponseMiddleware } from '../middlewares/convertJSONResponseMiddleware';
import { RequestInfoVerifyMiddleware } from '../middlewares/requestInfoVerifyMiddleware';
import ConnexPro from '../utils/connexPro';


export class Mempool extends Router {
    private readonly env:any;
    private readonly connex:ConnexPro;
    private readonly verifyMiddleware:RequestInfoVerifyMiddleware;
    private readonly transConverter:TransactionConverter;

    constructor(env:any){
        super();
        this.env = env;
        this.connex = this.env.connex;
        this.verifyMiddleware = new RequestInfoVerifyMiddleware(this.env);
        this.transConverter = new TransactionConverter(this.env);
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

    private async getTransactions(origin?:string, expanded: boolean = false):Promise<Connex.Thor.Transaction[] | string[]> {
        const baseUrl = this.connex.baseUrl + '/node/txpool';
        const expandedParam = expanded ? '?expanded=true' : '';
        const originParam = expanded ? '&' : '?';
        const originQuery = origin ? `${originParam}origin=${origin}` : '';
        const url = `${baseUrl}${expandedParam}${originQuery}`;
        
        const response = await axios.get(url);
        const transactions = expanded ? response.data as Connex.Thor.Transaction[] : response.data as string[];

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
            const txPool = await this.getTransactions(undefined,true) as Connex.Thor.Transaction[];
            const tx = txPool.find((tx) => {
                return tx.id == ctx.request.body.transaction_identifier.hash;
            });
            if(tx == undefined){
                ConvertJSONResponseMiddleware.KnowErrorJSONResponse(ctx,getError(25,undefined,{
                    error: 'Transaction not found in mempool'
                }));
            } else {
                const operations = await this.transConverter.convertClausesToOperations(tx);
                ConvertJSONResponseMiddleware.BodyDataToJSONResponse(ctx,{
                    transaction: {
                        transaction_identifier: {
                            hash: tx.id
                        },
                        operations
                    }
                });
            }
        }
        await next();
    }
}