import Router from "koa-router";
import { GlobalEnvironment } from "../../globalEnvironment";
import { BlockChainInfoService } from "../../../server/service/blockchainInfoService";
import { environment } from "../..";
import { NetworkType } from "../../../server/datameta/networkType";
import { BlockDetail } from "../../../server/datameta/block";
import { ActionResultWithData } from "../../../utils/components/actionResult";
import { ConvertJSONResponeMiddleware } from "../../middleware/convertJSONResponeMiddleware";
import { Transaction } from "../../../server/datameta/transaction";

export default class BlockController{
    public getBlock:Router.IMiddleware;
    public getTransactionByBlock:Router.IMiddleware;

    constructor(){
        this._environment = environment;
        this._blockChainService = new BlockChainInfoService(this._environment);

        this.getBlock = async (ctx:Router.IRouterContext,next: () => Promise<any>)=>{
            let networkType = ctx.request.body.network_identifier.network == "mainnet" ? NetworkType.MainNet : NetworkType.TestNet;
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

            let blockDetailResult = await this._blockChainService.getBlockDetail(networkType,revision);
            this._getBlockDetailConvertToResponce(ctx,blockDetailResult);
            await next();   
        }

        this.getTransactionByBlock = async (ctx:Router.IRouterContext,next: () => Promise<any>) =>{
            let networkType = ctx.request.body.network_identifier.network == "mainnet" ? NetworkType.MainNet : NetworkType.TestNet;
            let transactionID = ctx.request.body.transaction_identifier.hash;
            let revision = undefined;

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

    private _environment:GlobalEnvironment;
    private _blockChainService:BlockChainInfoService;

    private async _getBlockDetailConvertToResponce(ctx:Router.IRouterContext,actionResult:ActionResultWithData<BlockDetail>){
        let response:any | undefined;
        if(actionResult.Result){
            response = {
                block:actionResult.Data!
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