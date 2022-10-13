import Joi from "joi";
import Router from "koa-router";
import { BlockIdentifier } from "../common/types/identifiers";
import { ConvertJSONResponeMiddleware } from "../middlewares/convertJSONResponeMiddleware";
import { RequestInfoVerifyMiddleware } from "../middlewares/requestInfoVerifyMiddleware";
import ConnexPro from "../utils/connexPro";
import { getError } from "../common/errors";

export class Events extends Router {
    constructor(env:any){
        super();
        this.env = env;
        this.connex = this.env.connex;
        this.verifyMiddleware = new RequestInfoVerifyMiddleware(this.env);
        this.post('/events/blocks',
            async (ctx,next) => { await this.verifyMiddleware.checkNetwork(ctx,next);},
            async (ctx,next) => { await this.verifyMiddleware.checkRunMode(ctx,next);},
            async (ctx,next) => { await this.verifyMiddleware.checkModeNetwork(ctx,next);},
            async (ctx,next) => { await this.blocks(ctx,next);}
        );
    }

    private async blocks(ctx:Router.IRouterContext,next: () => Promise<any>){
        if(this.checkBlocksRequest(ctx)){
            const offset = ctx.request.body?.offset || 0;
            const limit = ctx.request.body?.limit || 50;

            const bestBlockNum = this.connex.thor.status.head.number;
            if(bestBlockNum < offset){
                ConvertJSONResponeMiddleware.BodyDataToJSONResponce(ctx,{
                    max_sequence:bestBlockNum,
                    events:[]
                })
            } else {
                const events = new Array<{sequence:number,block_identifier:BlockIdentifier,type:'block_added'}>
                for(let index = offset; index < offset + limit; index++){
                    const block = await this.connex.thor.block(index).get();
                    if(block != undefined){
                        events.push({
                            sequence:index,
                            block_identifier:{
                                index:index,
                                hash:block?.id
                            },
                            type: 'block_added'
                        })
                    }
                    if(index == bestBlockNum){
                        break;
                    }
                }
                ConvertJSONResponeMiddleware.BodyDataToJSONResponce(ctx,{
                    max_sequence:bestBlockNum,
                    events:events
                })
            }
        }
        await next();
    }

    private checkBlocksRequest(ctx: Router.IRouterContext):boolean{
        const schema = Joi.object({
            offset:Joi.number().min(0).default(0),
            limit:Joi.number().min(1).max(100).default(100)
        });
        const verify = schema.validate(ctx.request.body,{allowUnknown:true});
        if(verify.error == undefined){
            return true;
        } else {
            ConvertJSONResponeMiddleware.KnowErrorJSONResponce(ctx,getError(21));
        }
        return false;
    }

    private env:any;
    private verifyMiddleware:RequestInfoVerifyMiddleware;
    private connex:ConnexPro;
}