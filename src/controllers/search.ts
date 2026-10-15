import type Koa from "koa";
import Router from "koa-router";
import { getError } from "../common/errors";
import { TransactionConverter } from '../common/transConverter';
import { RequestContext } from "../common/types/context";
import { Env } from "../common/types/env";
import { BlockIdentifier } from "../common/types/identifiers";
import { TransactionIdentifierRequest } from "../common/types/requests";
import { ConvertJSONResponseMiddleware } from "../middlewares/convertJSONResponseMiddleware";
import { RequestInfoVerifyMiddleware } from "../middlewares/requestInfoVerifyMiddleware";
import ConnexPro from "../utils/connexPro";

export class Search extends Router {
    constructor(env:Env){
        super();
        this.env = env;
        this.connex = this.env.connex;
        this.transConverter = new TransactionConverter(this.env);
        this.verifyMiddleware = new RequestInfoVerifyMiddleware(this.env);
        this.post('/search/transactions',
            async (ctx,next) => { await this.verifyMiddleware.checkNetwork(ctx,next);},
            async (ctx,next) => { await this.verifyMiddleware.checkRunMode(ctx,next);},
            async (ctx,next) => { await this.verifyMiddleware.checkModeNetwork(ctx,next);},
            async (ctx,next) => { await this.transactions(ctx as RequestContext<TransactionIdentifierRequest>,next);}
        );
    }

    private async transactions(ctx:RequestContext<TransactionIdentifierRequest>,next:Koa.Next){
        if(this.verifyMiddleware.checkTransactionIdentifier(ctx)){
            const txid = ctx.request.body.transaction_identifier.hash;
            const txRecp = await this.connex.thor.transaction(txid).getReceipt();
            if(txRecp != undefined){
                const block_identifier:BlockIdentifier = {
                    index:txRecp.meta.blockNumber,
                    hash:txRecp.meta.blockID
                }
                // Same receipt-based operations as /block and /block/transaction.
                const transaction = await this.transConverter.parseRosettaTransaction(txid);
                ConvertJSONResponseMiddleware.BodyDataToJSONResponse(ctx,{
                    transactions:[
                        {
                            block_identifier:block_identifier,
                            transaction:transaction
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

    private env:Env;
    private connex:ConnexPro;
    private verifyMiddleware:RequestInfoVerifyMiddleware;
    private readonly transConverter:TransactionConverter;
}