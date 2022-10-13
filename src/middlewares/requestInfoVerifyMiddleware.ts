import * as Router from 'koa-router';
import * as Joi from 'joi';
import { ConvertJSONResponeMiddleware } from './convertJSONResponeMiddleware';
import { CheckSchema } from '../common/checkSchema';
import { getError } from '../common/errors';


export class RequestInfoVerifyMiddleware{
    constructor(env:any){
        this.env = env;
    }

    public async checkNetwork(ctx:any,next:()=>Promise<any>){
        const check = CheckSchema.checkNetworkIdentifier(ctx.request.body.network_identifier);
        if(check.result == false){
            ConvertJSONResponeMiddleware.KnowErrorJSONResponce(ctx,getError(22,undefined,{
                error:check.error
            }));
            return;
        }
        await next();
    }

    public async checkModeNetwork(ctx:any,next:()=>Promise<any>){
        if(this.env.config.mode == 'online'){
            if(ctx.request.body.network_identifier.network != this.env.config.network){
                ConvertJSONResponeMiddleware.KnowErrorJSONResponce(ctx,getError(22,undefined,{
                    error:`The request network is ${ctx.request.body.network_identifier.network},node network is ${this.env.config.network}`
                }));
                return;
            }
        }
        await next();
    }

    public async checkAccount(ctx:any,next:()=>Promise<any>){
        const check = CheckSchema.checkAccountIdentifier(ctx.request.body.account_identifier);
        if(check.result == false){
            ConvertJSONResponeMiddleware.KnowErrorJSONResponce(ctx,getError(23,undefined,{
                error:check.error
            }));
            return;
        }
        await next();
    }

    public async checkBlock(ctx:any,next:()=>Promise<any>){
        const check = CheckSchema.checkBlockIdentifier(ctx.request.body.block_identifier);
        if(check.result == false){
            ConvertJSONResponeMiddleware.KnowErrorJSONResponce(ctx,getError(24,undefined,{
                error:check.error
            }));
            return;
        }
        await next();
    }

    public async checkTransaction(ctx:any,next:()=>Promise<any>){
        const check = CheckSchema.checkTransactionIdentifier(ctx.request.body.transaction_identifier);
        if(check.result == false){
            ConvertJSONResponeMiddleware.KnowErrorJSONResponce(ctx,getError(25,undefined,{
                error:check.error
            }));
            return;
        }
        await next();
    }

    public async checkSignedTransaction(ctx:any,next:()=>Promise<any>){
        const check = CheckSchema.checkSignedTransaction(ctx.request.body.signed_transaction);
        if(check.result == false){
            ConvertJSONResponeMiddleware.KnowErrorJSONResponce(ctx,getError(12,undefined,{
                error:check.error
            }));
            return;
        }
        await next();
    }

    public async checkRunMode(ctx:any,next:()=>Promise<any>){
        if(this.env.config.mode == 'offline'){
            ConvertJSONResponeMiddleware.KnowErrorJSONResponce(ctx,getError(26)); 
            return;
        }
        await next();
    }


    private env:any;
}