import Joi from 'joi';
import type Koa from 'koa';
import Router from 'koa-router';
import { CheckSchema } from '../common/checkSchema';
import { getError } from '../common/errors';
import { RequestContext } from '../common/types/context';
import { Env } from '../common/types/env';
import { NetworkIdentifier } from '../common/types/identifiers';
import { ConvertJSONResponseMiddleware } from './convertJSONResponseMiddleware';


export class RequestInfoVerifyMiddleware{
    constructor(env:Env){
        this.env = env;
    }

    public async checkNetwork(ctx:Router.IRouterContext,next:Koa.Next){
        const check = CheckSchema.checkNetworkIdentifier(RequestInfoVerifyMiddleware.field(ctx,'network_identifier'));
        if(check.result == false){
            ConvertJSONResponseMiddleware.KnowErrorJSONResponse(ctx,getError(22,undefined,{
                error:check.error
            }));
            return;
        }
        await next();
    }

    // Runs after checkNetwork, so network_identifier is known to be valid here.
    public async checkModeNetwork(ctx:Router.IRouterContext,next:Koa.Next){
        if(this.env.config.mode == 'online'){
            const network = (RequestInfoVerifyMiddleware.field(ctx,'network_identifier') as NetworkIdentifier).network;
            if(network != this.env.config.network){
                ConvertJSONResponseMiddleware.KnowErrorJSONResponse(ctx,getError(22,undefined,{
                    error:`The request network is ${network},node network is ${this.env.config.network}`
                }));
                return;
            }
        }
        await next();
    }

    public async checkAccount(ctx:Router.IRouterContext,next:Koa.Next){
        const check = CheckSchema.checkAccountIdentifier(RequestInfoVerifyMiddleware.field(ctx,'account_identifier'));
        if(check.result == false){
            ConvertJSONResponseMiddleware.KnowErrorJSONResponse(ctx,getError(23,undefined,{
                error:check.error
            }));
            return;
        }
        await next();
    }

    public async checkBlock(ctx:Router.IRouterContext,next:Koa.Next){
        const check = CheckSchema.checkBlockIdentifier(RequestInfoVerifyMiddleware.field(ctx,'block_identifier'));
        if(check.result == false){
            ConvertJSONResponseMiddleware.KnowErrorJSONResponse(ctx,getError(24,undefined,{
                error:check.error
            }));
            return;
        }
        await next();
    }

    public async checkTransaction(ctx:Router.IRouterContext,next:Koa.Next){
        const check = CheckSchema.checkTransactionIdentifier(RequestInfoVerifyMiddleware.field(ctx,'transaction_identifier'));
        if(check.result == false){
            ConvertJSONResponseMiddleware.KnowErrorJSONResponse(ctx,getError(25,undefined,{
                error:check.error
            }));
            return;
        }
        await next();
    }

    public async checkSignedTransaction(ctx:Router.IRouterContext,next:Koa.Next){
        const check = CheckSchema.checkSignedTransaction(RequestInfoVerifyMiddleware.field(ctx,'signed_transaction'));
        if(check.result == false){
            ConvertJSONResponseMiddleware.KnowErrorJSONResponse(ctx,getError(12,undefined,{
                error:check.error
            }));
            return;
        }
        await next();
    }

    public async checkRunMode(ctx:Router.IRouterContext,next:Koa.Next){
        if(this.env.config.mode == 'offline'){
            ConvertJSONResponseMiddleware.KnowErrorJSONResponse(ctx,getError(26)); 
            return;
        }
        await next();
    }

    public checkTransactionIdentifier(ctx:RequestContext<unknown>):boolean{
        const schema = Joi.object({
            transaction_identifier:Joi.object({
                hash:Joi.string().lowercase().length(66).regex(/^(-0x|0x)?[0-9a-f]*$/).required()
            }).required()
        }).unknown(true);
        const verify = schema.validate(ctx.request.body);
        if(verify.error == undefined){
            return true;
        } else {
            ConvertJSONResponseMiddleware.KnowErrorJSONResponse(ctx,getError(25,undefined,{
                error:verify.error
            }));
            return false;
        }
    }

    /** Reads one top-level field of the (not yet validated) request body. */
    private static field(ctx:Router.IRouterContext,name:string):unknown{
        const body = ctx.request.body as Record<string, unknown> | undefined;
        return body?.[name];
    }

    private env:Env;
}