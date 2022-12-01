import Axios from "axios";
import Router from "koa-router";
import { Errors, getError } from "../common/errors";
import { Allow } from "../common/types/allow";
import { OperationStatus, OperationType } from "../common/types/operation";
import { ConvertJSONResponeMiddleware } from "../middlewares/convertJSONResponeMiddleware";
import { RequestInfoVerifyMiddleware } from "../middlewares/requestInfoVerifyMiddleware";
import ConnexPro from "../utils/connexPro";

export class Network extends Router {
    constructor(env:any){
        super();
        this.env = env;
        this.connex = this.env.connex;
        this.verifyMiddleware = new RequestInfoVerifyMiddleware(this.env);
        
        this.post('/network/list',
         async (ctx,next) => { await this.list(ctx,next);},
        );
        this.post('/network/options',
            async (ctx,next) => { await this.verifyMiddleware.checkNetwork(ctx,next);},
            async (ctx,next) => { await this.option(ctx,next);}
        );
        this.post('/network/status',
            async (ctx,next) => { await this.verifyMiddleware.checkNetwork(ctx,next);},
            async (ctx,next) => { await this.verifyMiddleware.checkRunMode(ctx,next);},
            async (ctx,next) => { await this.verifyMiddleware.checkModeNetwork(ctx,next);},
            async (ctx,next) => { await this.status(ctx,next);}
        );
    }

    private async list(ctx:Router.IRouterContext,next: () => Promise<any>){
        ConvertJSONResponeMiddleware.BodyDataToJSONResponce(ctx,{
            network_identifiers:[{
                blockchain:'vechainthor',
                network:this.env.config.network
            }]
        });
        await next();
    }

    private async option(ctx:Router.IRouterContext,next: () => Promise<any>){
        const versions = {
            rosetta_version:this.env.config.rosetta_version,
            node_version:this.env.config.node_version
        }
        const allow:Allow = {
            operation_statuses:[
                {status:OperationStatus.None,successful:true},
                {status:OperationStatus.Succeeded,successful:true},
                {status:OperationStatus.Reverted,successful:false}
            ],
            operation_types:[OperationType.None,OperationType.Transfer,OperationType.Fee,OperationType.FeeDelegation],
            errors:new Array(),
            historical_balance_lookup:true,
            call_methods:new Array(),
            balance_exemptions:new Array(),
            mempool_coins:false
        }
        for(const key of Errors.keys()){
            allow.errors.push(Errors.get(key)!);
        }
        ConvertJSONResponeMiddleware.BodyDataToJSONResponce(ctx,{
            version:versions,
            allow:allow
        });
    }

    private async status(ctx:Router.IRouterContext,next: () => Promise<any>){
        try {
            const bestBlock = (await this.connex.thor.block().get())!;
            const genesisBlock = (await this.connex.thor.block(0).get())!;
            const process = this.connex.thor.status.progress;
            const peers = await this.getPeers();
            const targetIndex = this.getTargetIndex(bestBlock.number,peers);
            const response = {
                current_block_identifier:{
                    index:bestBlock.number,
                    hash:bestBlock.id
                },
                current_block_timestamp:bestBlock.timestamp * 1000,
                genesis_block_identifier:{
                    index:0,
                    hash:genesisBlock.id
                },
                sync_status:{
                    current_index:bestBlock.number,
                    target_index:targetIndex,
                    stage:'block sync',
                    synced:process == 1 ? true:false
                },
                peers:new Array()
            };
            
            for(const peer of peers){
                response.peers.push({peer_id:peer.peerID});
            }
            ConvertJSONResponeMiddleware.BodyDataToJSONResponce(ctx,response);
        } catch (error) {
            ConvertJSONResponeMiddleware.KnowErrorJSONResponce(ctx,getError(500,undefined,{
                error:error
            }))
        }
        
        await next();
    }

    private async getPeers():Promise<Array<{peerID:string,bestBlockID:string}>>{
        let result = new Array<{peerID:string,bestBlockID:string}>();
        try {
            const url = this.env.config.nodeApi + '/node/network/peers';
            const response = await Axios({url:url,method:'Get',responseType:'json'});
            if(response.data != undefined){
                for(const peer of response.data){
                    result.push({peerID:peer.peerID,bestBlockID:peer.bestBlockID});
                }
            }
        } catch (error) {
            console.warn(`get peers error: ${error}`);
        }
        return result;
    }

    private getTargetIndex(localIndex:number,peers:Array<{peerID:string,bestBlockID:string}>):number{
        let result = localIndex;
        for(const peer of peers){
            const blockNum = Number(BigInt(peer.bestBlockID.substring(0,10)).toString(10));
            if(result < blockNum){
                result = blockNum;
            }
        }
        return result;
    }

    private env:any;
    private connex:ConnexPro;
    private verifyMiddleware:RequestInfoVerifyMiddleware;
}