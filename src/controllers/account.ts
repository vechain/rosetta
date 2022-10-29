import Router from "koa-router";
import { Amount } from "../common/types/amount";
import { ConvertJSONResponeMiddleware } from "../middlewares/convertJSONResponeMiddleware";
import { RequestInfoVerifyMiddleware } from "../middlewares/requestInfoVerifyMiddleware";
import ConnexPro from "../utils/connexPro";
import Axios from "axios";
import { BlockIdentifier } from "../common/types/identifiers";
import { Token } from "../common/types/token";
import { VIP180Token } from "../utils/vip180Token";
import { getError } from "../common/errors";
import { VETCurrency, VTHO, VTHOCurrency } from "..";

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

    private async balance(ctx:any,next: () => Promise<any>){
        const account = ctx.request.body.account_identifier.address;
        const subaccount = ctx.request.body.account_identifier.sub_account?.address || "";
        let revision = undefined;
        if(ctx.request.body.block_identifier?.index != undefined){
            revision = ctx.request.body.block_identifier.index;
        } else if (ctx.request.body.block_identifier?.hash != undefined){
            revision = ctx.request.body.block_identifier.hash;
        }

        try {
            const block = await this.connex.thor.block(revision).get();
            if(block != null){
                if(subaccount != ''){
                    const tokenConf = this.tokenList.find( t => {return t.address.toLowerCase() == subaccount.toLowerCase()});
                    if(tokenConf != undefined){
                        const token = new VIP180Token(tokenConf.address,this.connex);
                        const balance = await token.balanceOf(account,block.id);
                        const response:{block_identifier:BlockIdentifier,balances:Array<Amount>} = {
                            block_identifier:{
                                index:block.number,
                                hash:block.id
                            },
                            balances:[{
                                value:balance.toString(10),
                                currency:{
                                    symbol:tokenConf.symbol,
                                    decimals:tokenConf.decimals,
                                    metadata:{...tokenConf.metadata,contractAddress:tokenConf.address}
                                }
                            }]
                        }
                        ConvertJSONResponeMiddleware.BodyDataToJSONResponce(ctx,response);
                    } else {
                        ConvertJSONResponeMiddleware.KnowErrorJSONResponce(ctx,getError(1,undefined,{
                            subaccount:subaccount
                        }));
                    }
                } else {
                    const balances = await this.getAccountBalance(account,block.id);
                    const response:{block_identifier:BlockIdentifier,balances:Array<Amount>} = {
                        block_identifier:{
                            index:block.number,
                            hash:block.id
                        },
                        balances:balances
                    }
                    ConvertJSONResponeMiddleware.BodyDataToJSONResponce(ctx,response);
                }
            } else {
                ConvertJSONResponeMiddleware.KnowErrorJSONResponce(ctx,getError(3,undefined,{
                    revision:revision
                }));
            }
        } catch (error) {
            ConvertJSONResponeMiddleware.KnowErrorJSONResponce(ctx,getError(500,undefined,error));
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

    private env:any;
    private connex:ConnexPro;
    private verifyMiddleware:RequestInfoVerifyMiddleware;
    private tokenList:Array<Token>;
}