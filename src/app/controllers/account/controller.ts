import Router from "koa-router";
import { NetworkType } from "../../../server/types/networkType";
import { AccountService } from "../../../server/service/accountService";
import { ActionResultWithData2 } from "../../../utils/components/actionResult";
import { BlockIdentifier } from "../../../server/types/block";
import { Amount, Currency } from "../../../server/types/amount";
import { ConvertJSONResponeMiddleware } from "../../middleware/convertJSONResponeMiddleware";
import { BaseController } from "../../../utils/components/baseController";
import * as Joi from 'joi';
import { RosettaErrorDefine } from "../../../server/types/rosettaError";

export default class AccountController extends BaseController{
    public getAccountBalance:Router.IMiddleware;

    constructor(env:any){
        super(env);
        this._accountService = new AccountService(this.environment);
        
        this.getAccountBalance = async (ctx:Router.IRouterContext,next: () => Promise<any>)=>{
            let networkType = ctx.request.body.network_identifier.network == "main" ? NetworkType.MainNet : NetworkType.TestNet;
            let address = ctx.request.body.account_identifier.address;
            let revision:any = undefined;
            
            if(ctx.request.body.block_identifier != null){
                if(ctx.request.body.block_identifier.hash != null){
                    revision = ctx.request.body.block_identifier.hash;
                }else if(ctx.request.body.block_identifier.index != null){
                    revision = ctx.request.body.block_identifier.index;
                }
            } else {
                revision = "best";
            }

            if(ctx.request.body.currencies == undefined || this._checkCurrencies(ctx)){
                let currencies = ctx.request.body.currencies ? ctx.request.body.currencies : Array<Currency>();
                let getAccountBalanceResult = await this._accountService.getAccountBalance(networkType,address,revision,currencies);
                this._getAccountBalanceConvertToResponce(ctx,getAccountBalanceResult);
            } else {
                ConvertJSONResponeMiddleware.KnowErrorJSONResponce(ctx,RosettaErrorDefine.CURRENCYINVALID);
            }
            await next();   
        }
    }
    private _accountService:AccountService;

    private async _getAccountBalanceConvertToResponce(ctx:Router.IRouterContext,actionResult:ActionResultWithData2<BlockIdentifier,Array<Amount>>){
        let response:any | undefined;
        if(actionResult.Result){
            response = {
                block_identifier:actionResult.Data!,
                balances:actionResult.Data2
            }
        }
        ConvertJSONResponeMiddleware.ActionResultJSONResponse(ctx,actionResult,response);
    }

    private _checkCurrencies(ctx:Router.IRouterContext):boolean{
        let currenciesSchema = Joi.array().items({
            symbol:Joi.string().required(),
            decimals:Joi.number().required()
        });
        let verify = currenciesSchema.validate(ctx.request.body.currencies,{allowUnknown:true});
        if(verify.error){
            return false;
        }
        return true;
    }
}