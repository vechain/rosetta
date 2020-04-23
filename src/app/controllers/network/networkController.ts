import Router from "koa-router";
import { environment } from "../..";
import { BaseInfoService } from "../../../server/service/baseInfoService";
import { GlobalEnvironment } from "../../globalEnvironment";
import { ActionResultWithData } from "../../../utils/components/actionResult";
import { NetworkIdentifier } from "../../../server/datameta/network";
import { ConvertJSONResponeMiddleware } from "../../middleware/convertJSONResponeMiddleware";

export default class NetworkController{
    public getNetworkList:Router.IMiddleware;
    public getNetworkOptions:Router.IMiddleware;
    public getNetworkStatus:Router.IMiddleware;

    constructor(){
        this._environment = environment;
        this._baseInfoService = new BaseInfoService(this._environment);
        
        this.getNetworkList = async (ctx:Router.IRouterContext,next: () => Promise<any>)=>{
            let networkList = await this._baseInfoService.getNetworkList();
            this.getNetworkListConvertToResponce(ctx,networkList);
            await next();
        };
        this.getNetworkOptions = async (ctx:Router.IRouterContext,next: () => Promise<any>)=>{};
        this.getNetworkStatus = async (ctx:Router.IRouterContext,next: () => Promise<any>)=>{};
    }

    private _environment:GlobalEnvironment;
    private _baseInfoService:BaseInfoService;

    private async getNetworkListConvertToResponce(ctx:Router.IRouterContext,actionResult:ActionResultWithData<NetworkIdentifier[]>){
        let responce:any | undefined;
        if(actionResult.Result){
            responce = {
                network_identifiers:actionResult.Data
            }
        }
        ConvertJSONResponeMiddleware.ActionResultJSONResponce(ctx,actionResult,responce);
    }
}