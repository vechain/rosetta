import * as Router from 'koa-router';
import { ConvertJSONResponeMiddleware } from './convertJSONResponeMiddleware';
import { environment, logHelper } from '..';
import * as Joi from 'joi';
import { RosettaErrorDefine } from '../../server/types/rosettaError';
import { NetworkType } from '../../server/types/networkType';
import { BigNumberEx } from '../../utils/helper/bigNumberEx';

export class RequestInfoVerifyMiddleware{

    public static async CheckNetWorkRequestInfo(ctx:Router.IRouterContext,next:()=>Promise<any>){
        let requestVerifySchema = Joi.object({
            network_identifier:{
                blockchain:Joi.string().valid("vechainthor").required(),
                network:Joi.string().valid("main","test").required()
            }
        });
        let verify = requestVerifySchema.validate(ctx.request.body,{allowUnknown:true});
        if(!verify.error){
            await next();
        }else{
            ConvertJSONResponeMiddleware.KnowErrorJSONResponce(ctx,RosettaErrorDefine.NETWORKIDENTIFIERINVALID);
            return;
        }
    }

    public static async CheckNetWorkTypeRequestInfo(ctx:Router.IRouterContext,next:()=>Promise<any>){
        if((environment.config.mode as string) == "online"){
            if(ctx.request.body.network_identifier.network == "main" && environment.netconnex != null && environment.netconnex.NetWorkType == NetworkType.MainNet){
                await next();
            }else if(ctx.request.body.network_identifier.network == "test" && environment.netconnex != null && environment.netconnex.NetWorkType == NetworkType.TestNet){
                await next();
            }else{
                ConvertJSONResponeMiddleware.KnowErrorJSONResponce(ctx,RosettaErrorDefine.NODECONNETCONNECTION);
                return;
            }
        } else {
            await next();
        }
    }

    public static async CheckAccountRequestInfo(ctx:Router.IRouterContext,next:()=>Promise<any>){
        let requestVerifySchema = Joi.object({
            account_identifier:{
                address:Joi.string().lowercase().length(42).regex(/^(-0x|0x)?[0-9a-f]*$/).required(),
                sub_account:Joi.object({
                    address:Joi.string().lowercase().length(42).regex(/^(-0x|0x)?[0-9a-f]*$/)
                })
            }
        });
        let verify = requestVerifySchema.validate(ctx.request.body,{allowUnknown:true});
        if(!verify.error){
            await next();
            
        }else{
            ConvertJSONResponeMiddleware.KnowErrorJSONResponce(ctx,RosettaErrorDefine.ACCOUNTIDENTIFIERINVALID);
            return;
        }
    }

    public static async CheckBlockRequestInfo(ctx:Router.IRouterContext,next:()=>Promise<any>){
        if(ctx.request.body.block_identifier != null){
            if(ctx.request.body.block_identifier.index != null){
                let requestVerifySchema = Joi.object({
                    block_identifier:{
                        index:Joi.number().min(0).required()
                    }
                });
                let verify = requestVerifySchema.validate(ctx.request.body,{allowUnknown:true});
                if(verify.error != null){
                    ConvertJSONResponeMiddleware.KnowErrorJSONResponce(ctx,RosettaErrorDefine.BLOCKIDENTIFIERINVALID);
                    return;
                }
            }else if(ctx.request.body.block_identifier.hash != null){
                let requestVerifySchema = Joi.object({
                    block_identifier:{
                        hash:Joi.string().length(66).regex(/^(-0x|0x)?[0-9a-f]*$/).required()
                    }
                });
                let verify = requestVerifySchema.validate(ctx.request.body,{allowUnknown:true});
                if(verify.error != null){
                    ConvertJSONResponeMiddleware.KnowErrorJSONResponce(ctx,RosettaErrorDefine.BLOCKIDENTIFIERINVALID);
                    return;
                }
            }

            if(ctx.request.body.block_identifier.index != null && ctx.request.body.block_identifier.hash != null){
                let blockHeight = (ctx.request.body.block_identifier.hash as string).substr(0,10);
                if(!(new BigNumberEx(ctx.request.body.block_identifier.index as number).isEqualTo(new BigNumberEx(blockHeight)))){
                    ConvertJSONResponeMiddleware.KnowErrorJSONResponce(ctx,RosettaErrorDefine.BLOCKIDENTIFIERINVALID);
                    return;
                }
            }
        }
        await next();
    }

    public static async CheckTransactionRequestInfo(ctx:Router.IRouterContext,next:()=>Promise<any>){
        let requestVerifySchema = Joi.object({
            transaction_identifier:{
                hash:Joi.string().lowercase().length(66).regex(/^(-0x|0x)?[0-9a-f]*$/).required()
            }
        });
        let verify = requestVerifySchema.validate(ctx.request.body,{allowUnknown:true});
        if(!verify.error){
            await next();
            
        }else{
            ConvertJSONResponeMiddleware.KnowErrorJSONResponce(ctx,RosettaErrorDefine.BADREQUEST);
            return;
        }
    }

    public static async CheckSignedTransactionRequestInfo(ctx:Router.IRouterContext,next:()=>Promise<any>){
        let requestVerifySchema = Joi.object({
            signed_transaction:Joi.string().lowercase().regex(/^(-0x|0x)?[0-9a-f]*$/).required()
        });
        let verify = requestVerifySchema.validate(ctx.request.body,{allowUnknown:true});
        if(!verify.error){
            await next();
        }else{
            ConvertJSONResponeMiddleware.KnowErrorJSONResponce(ctx,RosettaErrorDefine.TRANSACTIONIDENTIFIERINVALID);
            return;
        }
    }

    public static async CheckRunMode(ctx:Router.IRouterContext,next:()=>Promise<any>){
        if((environment.config.mode as string) == "online"){
            await next();
        } else {
            ConvertJSONResponeMiddleware.KnowErrorJSONResponce(ctx,RosettaErrorDefine.MODEISOFFLINE);
            return;
        }
    }
}