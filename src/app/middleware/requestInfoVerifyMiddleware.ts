import * as Router from 'koa-router';
import { ConvertJSONResponeMiddleware } from './convertJSONResponeMiddleware';
import { RosettaErrorDefine } from '../../server/datameta/rosettaError';
import { environment } from '..';
import * as Joi from 'joi';
import { NetworkType } from '../../server/datameta/networkType';

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
            if(ctx.request.body.network_identifier.network == "main" && environment.netconnex != null && environment.netconnex.NetWorkType == NetworkType.MainNet){
                await next();
            }else if(ctx.request.body.network_identifier.network == "test" && environment.netconnex != null && environment.netconnex.NetWorkType == NetworkType.TestNet){
                await next();
            }else{
                ConvertJSONResponeMiddleware.KnowErrorJSONResponce(ctx,RosettaErrorDefine.NODECONNETCONNECTION);
                return;
            }
            
        }else{
            ConvertJSONResponeMiddleware.KnowErrorJSONResponce(ctx,RosettaErrorDefine.BADREQUEST);
            return;
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
            ConvertJSONResponeMiddleware.KnowErrorJSONResponce(ctx,RosettaErrorDefine.BADREQUEST);
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
                    ConvertJSONResponeMiddleware.KnowErrorJSONResponce(ctx,RosettaErrorDefine.BADREQUEST);
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
                    ConvertJSONResponeMiddleware.KnowErrorJSONResponce(ctx,RosettaErrorDefine.BADREQUEST);
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
            ConvertJSONResponeMiddleware.KnowErrorJSONResponce(ctx,RosettaErrorDefine.BADREQUEST);
            return;
        }
    }
}