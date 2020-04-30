import { GlobalEnvironment } from "../../globalEnvironment";
import { environment } from "../..";
import Router from "koa-router";
import { NetworkType } from "../../../server/datameta/networkType";
import { BaseInfoService } from "../../../server/service/baseInfoService";
import { ActionResultWithData } from "../../../utils/components/actionResult";
import { Construction } from "../../../server/datameta/construction";
import { ConvertJSONResponeMiddleware } from "../../middleware/convertJSONResponeMiddleware";

export default class ConstructionController{

    public getConstructionMetadata:Router.IMiddleware;

    constructor(){
        this._environment = environment;
        this._baseInfoService = new BaseInfoService(this._environment);

        this.getConstructionMetadata = async (ctx:Router.IRouterContext,next: () => Promise<any>)=>{
            let networkType = ctx.request.body.network_identifier.network == "mainnet" ? NetworkType.MainNet : NetworkType.TestNet;
            let getConstructionResult = this._baseInfoService.getConstructionMetadata(networkType);
            this._getConstructionMetadataConvertToJSONResult(ctx,getConstructionResult);
            await next();
            
        };
    }

    private _environment:GlobalEnvironment;
    private _baseInfoService:BaseInfoService;

    private _getConstructionMetadataConvertToJSONResult(ctx:Router.IRouterContext,actionResult:ActionResultWithData<Construction>){
        let response:any | undefined;
        if(actionResult.Result){
            response = {
                metadata:actionResult.Data
            }
        }
        ConvertJSONResponeMiddleware.ActionResultJSONResponse(ctx,actionResult,response);
    }
}