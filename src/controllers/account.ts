import Router from "koa-router";
import { Amount } from "../common/types/amount";
import { ConvertJSONResponeMiddleware } from "../middlewares/convertJSONResponeMiddleware";
import { RequestInfoVerifyMiddleware } from "../middlewares/requestInfoVerifyMiddleware";
import ConnexPro from "../utils/connexPro";
import Axios from "axios";
import { BlockIdentifier } from "../common/types/identifiers";
import { VIP180Token } from "../utils/vip180Token";
import { getError } from "../common/errors";
import { VETCurrency, VTHOCurrency } from "..";
import { Currency } from "../common/types/currency";
import Joi from "joi";

export class Account extends Router {
    constructor(env:any){
        super();
        this.env = env;
        this.connex = this.env.connex;
        this.tokenList = this.env.config.tokenlist;
        this.verifyMiddleware = new RequestInfoVerifyMiddleware(this.env);
        this.post('/account/balance',
                async (ctx,next) => { await this.verifyMiddleware.checkNetwork(ctx,next);},
                async (ctx,next) => { await this.verifyMiddleware.checkRunMode(ctx,next);},
                async (ctx,next) => { await this.verifyMiddleware.checkModeNetwork(ctx,next);},
                async (ctx,next) => { await this.verifyMiddleware.checkAccount(ctx,next);},
                async (ctx,next) => { await this.balance(ctx,next);} 
            );
    }

    // private async balance_1(ctx:any,next: () => Promise<any>){
    //     const account = ctx.request.body.account_identifier.address;
    //     const subaccount = ctx.request.body.account_identifier.sub_account?.address || "";
    //     let revision = undefined;

    //     if(ctx.request.body.block_identifier?.hash != undefined){
    //         revision = ctx.request.body.block_identifier.hash;
    //     } else if(ctx.request.body.block_identifier?.index != undefined){
    //         revision = ctx.request.body.block_identifier.index;
    //     }

    //     try {
    //         const block = await this.connex.thor.block(revision).get();
    //         if(block != null){
    //             if(subaccount != ''){
    //                 const tokenConf = this.tokenList.find( t => {return t.metadata.contractAddress.toLowerCase() == subaccount.toLowerCase()});
    //                 if(tokenConf != undefined){
    //                     const token = new VIP180Token(tokenConf.metadata.contractAddress,this.connex);
    //                     const created = await token.created(revision);
    //                     if(created == true){
    //                         const balance = await token.balanceOf(account,block.id);
    //                         const response:{block_identifier:BlockIdentifier,balances:Array<Amount>} = {
    //                             block_identifier:{
    //                                 index:block.number,
    //                                 hash:block.id
    //                             },
    //                             balances:[{
    //                                 value:balance.toString(10),
    //                                 currency:{
    //                                     symbol:tokenConf.symbol,
    //                                     decimals:tokenConf.decimals,
    //                                     metadata:{...tokenConf.metadata,contractAddress:tokenConf.metadata.contractAddress}
    //                                 }
    //                             }]
    //                         }
    //                         ConvertJSONResponeMiddleware.BodyDataToJSONResponce(ctx,response);
    //                     } else {
    //                         ConvertJSONResponeMiddleware.KnowErrorJSONResponce(ctx,getError(27,undefined,{
    //                             revision:revision
    //                         }));
    //                         return;
    //                     }
    //                 } else {
    //                     ConvertJSONResponeMiddleware.KnowErrorJSONResponce(ctx,getError(1,undefined,{
    //                         subaccount:subaccount
    //                     }));
    //                     return;
    //                 }
    //             } else {
    //                 const balances = await this.getAccountBalance(account,block.id);
    //                 const response:{block_identifier:BlockIdentifier,balances:Array<Amount>} = {
    //                     block_identifier:{
    //                         index:block.number,
    //                         hash:block.id
    //                     },
    //                     balances:balances
    //                 }
    //                 ConvertJSONResponeMiddleware.BodyDataToJSONResponce(ctx,response);
    //             }
    //         } else {
    //             ConvertJSONResponeMiddleware.KnowErrorJSONResponce(ctx,getError(3,undefined,{
    //                 revision:revision
    //             }));
    //             return;
    //         }
    //     } catch (error) {
    //         ConvertJSONResponeMiddleware.KnowErrorJSONResponce(ctx,getError(500,undefined,error));
    //         return;
    //     }
    //     await next();
    // }

    private async balance(ctx:any,next: () => Promise<any>){
        const verify = this.checkCurrencies(ctx.request.body.currencies);
        if(verify.result){
            const account = ctx.request.body.account_identifier.address;
            let revision = undefined;

            if(ctx.request.body.block_identifier?.hash != undefined){
                revision = ctx.request.body.block_identifier.hash;
            } else if(ctx.request.body.block_identifier?.index != undefined){
                revision = ctx.request.body.block_identifier.index;
            }

            let qlist = (ctx.request.body.currencies as Array<Currency>) || new Array<Currency>();
            const balances = new Array<{value:string,currency:Currency}>();
            if(qlist.length == 0){
                qlist.push(VETCurrency);
                qlist = qlist.concat(this.tokenList);
            }

            try {
                const block = await this.connex.thor.block(revision).get();
                if(block != null) {
                    for(const qtoken of qlist) {
                        if(qtoken.symbol == VETCurrency.symbol){
                            const accbalance = await this.getAccountBalance(account,block.id);
                            balances.push({value:accbalance[0].value,currency:accbalance[0].currency});
                        } else {
                            const tokenConf = this.tokenList.find( t => {return qtoken.metadata.contractAddress != undefined && t.metadata.contractAddress.toLowerCase() == qtoken.metadata.contractAddress.toLowerCase()});
                            if(tokenConf != undefined){
                                const token = new VIP180Token(tokenConf.metadata.contractAddress,this.connex);
                                const created = await token.created(revision);
                                if(created == true){
                                    const balance = await token.balanceOf(account,block.id);
                                    balances.push({value:balance.toString(10),currency:tokenConf});
                                } else {
                                    ConvertJSONResponeMiddleware.KnowErrorJSONResponce(ctx,getError(27,undefined,{
                                        contractAddress:qtoken.metadata.contractAddress,
                                        revision:revision
                                    }));
                                    return;
                                }
                            } else {
                                ConvertJSONResponeMiddleware.KnowErrorJSONResponce(ctx,getError(1,undefined,{
                                    contractAddress:qtoken.metadata.contractAddress
                                }));
                                return;
                            }
                        }
                    }
                    const response:{block_identifier:BlockIdentifier,balances:Array<Amount>} = {
                        block_identifier:{
                            index:block.number,
                            hash:block.id
                        },
                        balances:balances
                    }
                    ConvertJSONResponeMiddleware.BodyDataToJSONResponce(ctx,response);
                } else {
                    ConvertJSONResponeMiddleware.KnowErrorJSONResponce(ctx,getError(3,undefined,{
                        revision:revision
                    }));
                    return;
                }

            } catch (error) {
                ConvertJSONResponeMiddleware.KnowErrorJSONResponce(ctx,getError(500,undefined,error));
                return;
            }
        } else {
            ConvertJSONResponeMiddleware.KnowErrorJSONResponce(ctx,getError(31,undefined,{
                error:verify.error
            }));
            return;
        }
        await next();
    }

    private async getAccountBalance(account:string,blockid:string):Promise<Array<Amount>>{
        let result = new Array<Amount>();
        const url = this.connex.baseUrl + `/accounts/${account}`;
        const response = await Axios({url:url,method:'Get',responseType:'json',params:{revision:blockid}});
        result.push({
            value:BigInt(response.data.balance).toString(10),
            currency:VETCurrency
        });
        result.push({
            value:BigInt(response.data.energy).toString(10),
            currency:VTHOCurrency
        });
        return result;
    }

    private checkCurrencies(currencies:any):{result:boolean,error:any}{
        const schema = Joi.array().items(Joi.object({
            symbol:Joi.string().required(),
            decimals:Joi.number().min(0).required(),
            metadata:Joi.object({
                contractAddress:Joi.string().lowercase().length(42).regex(/^(-0x|0x)?[0-9a-f]*$/)
            })
        }));
        const verify = schema.validate(currencies,{allowUnknown:true});
        return {result:verify.error == undefined,error:verify.error};
    }

    private env:any;
    private connex:ConnexPro;
    private verifyMiddleware:RequestInfoVerifyMiddleware;
    private tokenList:Array<Currency>;
}