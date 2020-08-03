import { GlobalEnvironment } from "../../globalEnvironment";
import { environment } from "../..";
import Router from "koa-router";
import { NetworkType } from "../../../server/datameta/networkType";
import { BaseInfoService } from "../../../server/service/baseInfoService";
import { ActionResultWithData } from "../../../utils/components/actionResult";
import { Construction } from "../../../server/datameta/construction";
import { ConvertJSONResponeMiddleware } from "../../middleware/convertJSONResponeMiddleware";
import { BlockChainInfoService } from "../../../server/service/blockchainInfoService";

export default class ConstructionController{

    public getConstructionMetadata:Router.IMiddleware;
    public submitTransaction:Router.IMiddleware;

    constructor(){
        this._environment = environment;
        this._baseInfoService = new BaseInfoService(this._environment);
        this._blockChainInfoService = new BlockChainInfoService(this._environment);

        this.getConstructionMetadata = async (ctx:Router.IRouterContext,next: () => Promise<any>)=>{
            let networkType = ctx.request.body.network_identifier.network == "main" ? NetworkType.MainNet : NetworkType.TestNet;
            let getConstructionResult = this._baseInfoService.getConstructionMetadata(networkType);
            this._getConstructionMetadataConvertToJSONResult(ctx,getConstructionResult);
            await next();
            
        };

        this.submitTransaction = async (ctx:Router.IRouterContext,next: () => Promise<any>)=>{
            let networkType = ctx.request.body.network_identifier.network == "main" ? NetworkType.MainNet : NetworkType.TestNet;
            let signedTransaction = ctx.request.body.signed_transaction;
            let submitTransactionResult = await this._blockChainInfoService.sendSignedTransaction(networkType,signedTransaction);
            this._submitTransactionConvertToJSONResult(ctx,submitTransactionResult);
            await next();
        }        
    }

    private _environment:GlobalEnvironment;
    private _baseInfoService:BaseInfoService;
    private _blockChainInfoService:BlockChainInfoService;

    private _getConstructionMetadataConvertToJSONResult(ctx:Router.IRouterContext,actionResult:ActionResultWithData<Construction>){
        let response:any | undefined;
        if(actionResult.Result){
            response = {
                metadata:actionResult.Data
            }
        }
        ConvertJSONResponeMiddleware.ActionResultJSONResponse(ctx,actionResult,response);
    }

    private _submitTransactionConvertToJSONResult(ctx:Router.IRouterContext,actionResult:ActionResultWithData<string>){
        let response:any | undefined;
        if(actionResult.Result){
            response = {
                transaction_identifier:{
                    hash:actionResult.Data
                }
            }
        }
        ConvertJSONResponeMiddleware.ActionResultJSONResponse(ctx,actionResult,response);
    }
}