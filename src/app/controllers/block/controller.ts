import Router from "koa-router";
import { BlockChainInfoService } from "../../../server/service/blockchainInfoService";
import { NetworkType } from "../../../server/types/networkType";
import { BlockDetail } from "../../../server/types/block";
import { ActionResultWithData, ActionResultWithData2 } from "../../../utils/components/actionResult";
import { ConvertJSONResponeMiddleware } from "../../middleware/convertJSONResponeMiddleware";
import { Transaction } from "../../../server/types/transaction";
import { BaseController } from "../../../utils/components/baseController";

export default class BlockController extends BaseController{
    public getBlock:Router.IMiddleware;
    public getTransactionByBlock:Router.IMiddleware;

    constructor(env:any){
        super(env);
        this._blockChainService = new BlockChainInfoService(this.environment);

        this.getBlock = async (ctx:Router.IRouterContext,next: () => Promise<any>)=>{
            let networkType = ctx.request.body.network_identifier.network == "main" ? NetworkType.MainNet : NetworkType.TestNet;
            let revision:any = undefined;

            if(ctx.request.body.block_identifier != null){
                if(ctx.request.body.block_identifier.hash != null){
                    revision = ctx.request.body.block_identifier.hash;
                }else if(ctx.request.body.block_identifier.index != null){
                    revision = ctx.request.body.block_identifier.index;
                }else{
                    revision = "best";
                }
            }

            let blockDetailResult = await this._blockChainService.getBlockDetail(networkType,revision);
            this._getBlockDetailConvertToResponce(ctx,blockDetailResult);
            await next();   
        }

        this.getTransactionByBlock = async (ctx:Router.IRouterContext,next: () => Promise<any>) =>{
            let networkType = ctx.request.body.network_identifier.network == "main" ? NetworkType.MainNet : NetworkType.TestNet;
            let transactionID = ctx.request.body.transaction_identifier.hash;
            let revision:any = undefined;

            if(ctx.request.body.block_identifier != null){
                if(ctx.request.body.block_identifier.hash != null){
                    revision = ctx.request.body.block_identifier.hash;
                }else if(ctx.request.body.block_identifier.index != null){
                    revision = ctx.request.body.block_identifier.index;
                }
            }

            let transactionResult = await this._blockChainService.getTransactionByBlock(networkType,transactionID,revision);
            this._getTransactionByBlockConvertToResponce(ctx,transactionResult);
            await next();
        }
    }

    private _blockChainService:BlockChainInfoService;

    private async _getBlockDetailConvertToResponce(ctx:Router.IRouterContext,actionResult:ActionResultWithData2<BlockDetail,Array<{hash:string}>>){
        let response:any | undefined;
        if(actionResult.Result){

            if(actionResult.Data!.transactions!.length == 0){
                actionResult.Data!.transactions = undefined;
            }

            response = {
                block:actionResult.Data!,
                other_transactions:actionResult.Data2
            }
        }
        ConvertJSONResponeMiddleware.ActionResultJSONResponse(ctx,actionResult,response);
    }

    private async _getTransactionByBlockConvertToResponce(ctx:Router.IRouterContext,actionResult:ActionResultWithData<Transaction>){
        let response:any | undefined;
        if(actionResult.Result){
            response = {
                transaction:actionResult.Data!
            }
        }
        ConvertJSONResponeMiddleware.ActionResultJSONResponse(ctx,actionResult,response);
    }
}