import Router from "koa-router";
import { NetworkType } from "../../../server/types/networkType";
import { GlobalEnvironment } from "../../globalEnvironment";
import { AccountService } from "../../../server/service/accountService";
import { ActionResultWithData2, ActionResult } from "../../../utils/components/actionResult";
import { BlockIdentifier } from "../../../server/types/block";
import { Amount } from "../../../server/types/amount";
import { ConvertJSONResponeMiddleware } from "../../middleware/convertJSONResponeMiddleware";
import { BaseController } from "../../../utils/components/baseController";

export default class AccountController extends BaseController{
    public getAccountBalance:Router.IMiddleware;

    constructor(env:any){
        super(env);
        this._accountService = new AccountService(this.environment);
        
        this.getAccountBalance = async (ctx:Router.IRouterContext,next: () => Promise<any>)=>{
            let networkType = ctx.request.body.network_identifier.network == "main" ? NetworkType.MainNet : NetworkType.TestNet;
            let address = ctx.request.body.account_identifier.address;
            let subAccountAddress = ctx.request.body.account_identifier["sub_account"] && ctx.request.body.account_identifier["sub_account"]["address"] ?
            ctx.request.body.account_identifier["sub_account"]["address"] : "";
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

            let getAccountBalanceResult = await this._accountService.getAccountBalance(networkType,address,revision,subAccountAddress);
            this._getAccountBalanceConvertToResponce(ctx,getAccountBalanceResult);
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
}