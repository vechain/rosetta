import Router from "koa-router";
import { environment } from "../..";
import { NetworkType } from "../../../server/datameta/networkType";
import { GlobalEnvironment } from "../../globalEnvironment";
import { AccountService } from "../../../server/service/accountService";
import { ActionResultWithData2 } from "../../../utils/components/actionResult";
import { BlockIdentifier } from "../../../server/datameta/block";
import { Amount } from "../../../server/datameta/amount";
import { ConvertJSONResponeMiddleware } from "../../middleware/convertJSONResponeMiddleware";

export default class AccountController{
    public getAccountBalance:Router.IMiddleware;

    constructor(){
        this._environment = environment;

        this._accountService = new AccountService(this._environment);
        
        this.getAccountBalance = async (ctx:Router.IRouterContext,next: () => Promise<any>)=>{
            let networkType = ctx.request.body.network_identifier.network == "mainnet" ? NetworkType.MainNet : NetworkType.TestNet;
            let address = ctx.request.body.account_identifier.address;
            let revision = undefined;
            
            if(ctx.request.body.block_identifier != null){
                if(ctx.request.body.block_identifier.hash != null){
                    revision = ctx.request.body.block_identifier.hash;
                }else if(ctx.request.body.block_identifier.index != null){
                    revision = ctx.request.body.block_identifier.index;
                }else{
                    revision = "best";
                }
            }

            let getAccountBalanceResult = await this._accountService.getAccountBalance(networkType,address,revision);
            this._getAccountBalanceConvertToResponce(ctx,getAccountBalanceResult);
            await next();   
        }
    }

    private _environment:GlobalEnvironment;
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
}