import Router from "koa-router";
import { ActionResultWithData } from "../../../utils/components/actionResult";
import { NetworkIdentifier, NetworkOptionsResponse, SyncStatus } from "../../../server/types/network";
import { ConvertJSONResponeMiddleware } from "../../middleware/convertJSONResponeMiddleware";
import { BlockChainInfoService } from "../../../server/service/blockchainInfoService";
import { NetworkType } from "../../../server/types/networkType";
import { RosettaErrorDefine } from "../../../server/types/rosettaError";
import ThorPeer from "../../../server/types/peer";
import { BaseInfoService } from "../../../server/service/baseInfoService";
import { BaseController } from "../../../utils/components/baseController";

export default class NetworkController extends BaseController{
    public getNetworkList:Router.IMiddleware;
    public getNetworkOptions:Router.IMiddleware;
    public getNetworkStatus:Router.IMiddleware;

    constructor(env:any){
        super(env);
        this._blockChainInfoService = new BlockChainInfoService(this.environment);
        this._baseInfoService = new BaseInfoService(this.environment);
        
        this.getNetworkList = async (ctx:Router.IRouterContext,next: () => Promise<any>)=>{
            let networkList = this._baseInfoService.getNetworkList();
            this._getNetworkListConvertToResponce(ctx,networkList);
            await next();
        };

        this.getNetworkOptions = async (ctx:Router.IRouterContext,next: () => Promise<any>)=>{
            let networkType = ctx.request.body.network_identifier.network == "main" ? NetworkType.MainNet : NetworkType.TestNet;
            let networkOptions = this._baseInfoService.getNetworkOptions(networkType);
            this._getNetworkOptionsConvertToResponce(ctx,networkOptions);
            await next();
        };
        this.getNetworkStatus = async (ctx:Router.IRouterContext,next: () => Promise<any>)=>{
            let networkType = ctx.request.body.network_identifier.network == "main" ? NetworkType.MainNet : NetworkType.TestNet;

            let getGenesisBlock = this._blockChainInfoService.getGenesisBlock(networkType);
            let getBestBlockPromise = this._blockChainInfoService.getBestBlockStatus(networkType);
            let getPeersPromise = this._blockChainInfoService.getPeers(networkType);
            let getSyncStatus = this._baseInfoService.getSyncStatus(networkType);

            try {
                let promiseAllResult = await Promise.all([getBestBlockPromise,getPeersPromise]);
                if(getGenesisBlock.Result && promiseAllResult[0].Result &&  promiseAllResult[1].Result && getSyncStatus.Result){
                    this._getNetworkStatusConvertToResponce(ctx,getGenesisBlock.Data!,promiseAllResult[0].Data!,promiseAllResult[1].Data!,getSyncStatus.Data!);
                }else{
                    let error = getGenesisBlock.ErrorData || promiseAllResult[0].ErrorData || promiseAllResult[1].ErrorData || RosettaErrorDefine.INTERNALSERVERERROR;
                    ConvertJSONResponeMiddleware.KnowErrorJSONResponce(ctx,error);
                }
            } catch (error) {
                ConvertJSONResponeMiddleware.KnowErrorJSONResponce(ctx,RosettaErrorDefine.INTERNALSERVERERROR);
            }
            await next();
        };
    }

    private _blockChainInfoService:BlockChainInfoService;
    private _baseInfoService:BaseInfoService;

    private async _getNetworkListConvertToResponce(ctx:Router.IRouterContext,actionResult:ActionResultWithData<NetworkIdentifier[]>){
        let response:any | undefined;
        if(actionResult.Result){
            response = {
                network_identifiers:actionResult.Data
            }
        }
        ConvertJSONResponeMiddleware.ActionResultJSONResponse(ctx,actionResult,response);
    }

    private async _getNetworkStatusConvertToResponce(ctx:Router.IRouterContext,genesisBlock:Connex.Thor.Block,
            blockStatus:Connex.Thor.Status,peers:Array<ThorPeer>,syncStatus:SyncStatus){
        let response:any | undefined;
        response = {
            current_block_identifier:{
                index:blockStatus.head.number,
                hash:blockStatus.head.id
            },
            current_block_timestamp:blockStatus.head.timestamp * 1000,
            genesis_block_identifier:{
                index:genesisBlock.number,
                hash:genesisBlock.id
            },
            sync_status:syncStatus,
            peers:[]
        }

        for(let peer of peers){
            (response.peers as Array<any>).push({
                peer_id:peer.peerID
            });
        }

        ConvertJSONResponeMiddleware.BodyDataToJSONResponce(ctx,response);
    }

    private async _getNetworkOptionsConvertToResponce(ctx:Router.IRouterContext,actionResult:ActionResultWithData<NetworkOptionsResponse>){
        let response:any | undefined;
        if(actionResult.Result){
            response = actionResult.Data
        }
        ConvertJSONResponeMiddleware.ActionResultJSONResponse(ctx,actionResult,response);
    }
}