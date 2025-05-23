import Router from "koa-router";
import { getError } from "../common/errors";
import { TransactionConverter } from '../common/transConverter';
import { BlockIdentifier } from "../common/types/identifiers";
import { ConvertJSONResponseMiddleware } from "../middlewares/convertJSONResponseMiddleware";
import { RequestInfoVerifyMiddleware } from "../middlewares/requestInfoVerifyMiddleware";
import ConnexPro from "../utils/connexPro";

export class Search extends Router {
    constructor(env:any){
        super();
        this.env = env;
        this.connex = this.env.connex;
        this.transConverter = new TransactionConverter(this.env);
        this.verifyMiddleware = new RequestInfoVerifyMiddleware(this.env);
        this.post('/search/transactions',
            async (ctx,next) => { await this.verifyMiddleware.checkNetwork(ctx,next);},
            async (ctx,next) => { await this.verifyMiddleware.checkRunMode(ctx,next);},
            async (ctx,next) => { await this.verifyMiddleware.checkModeNetwork(ctx,next);},
            async (ctx,next) => { await this.transactions(ctx,next);}
        );
    }

    private async transactions(ctx:Router.IRouterContext,next: () => Promise<any>){
        if(this.verifyMiddleware.checkTransactionIdentifier(ctx)){
            const txid = ctx.request.body.transaction_identifier.hash as string;
            const tx = await this.connex.thor.transaction(txid).get();
            const txRecp = await this.connex.thor.transaction(txid).getReceipt();
            if(tx != undefined){
                const block_identifier:BlockIdentifier = {
                    index:tx.meta.blockNumber,
                    hash:tx.meta.blockID
                }
                const operations = this.transConverter.convertClausesToOperations(tx,txRecp);
                ConvertJSONResponseMiddleware.BodyDataToJSONResponse(ctx,{
                    transactions:[
                        {
                            block_identifier:block_identifier,
                            transaction:{
                                transaction_identifier:{
                                    hash:txid
                                }
                            },
                            operations:operations
                        }
                    ],
                    total_count:1
                })
            } else {
                ConvertJSONResponseMiddleware.KnowErrorJSONResponse(ctx,getError(4));
                return;
            }
        }
        await next();
    }

    private env:any;
    private connex:ConnexPro;
    private verifyMiddleware:RequestInfoVerifyMiddleware;
    private transConverter:TransactionConverter;
}