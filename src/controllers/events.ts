import Joi from "joi";
import type Koa from "koa";
import Router from "koa-router";
import { getError } from "../common/errors";
import { RequestContext } from "../common/types/context";
import { Env } from "../common/types/env";
import { BlockIdentifier } from "../common/types/identifiers";
import { EventsBlocksRequest } from "../common/types/requests";
import { ConvertJSONResponseMiddleware } from "../middlewares/convertJSONResponseMiddleware";
import { RequestInfoVerifyMiddleware } from "../middlewares/requestInfoVerifyMiddleware";
import ConnexPro from "../utils/connexPro";

export class Events extends Router {
    constructor(env:Env){
        super();
        this.env = env;
        this.connex = this.env.connex;
        this.verifyMiddleware = new RequestInfoVerifyMiddleware(this.env);
        this.post('/events/blocks',
            async (ctx,next) => { await this.verifyMiddleware.checkNetwork(ctx,next);},
            async (ctx,next) => { await this.verifyMiddleware.checkRunMode(ctx,next);},
            async (ctx,next) => { await this.verifyMiddleware.checkModeNetwork(ctx,next);},
            async (ctx,next) => { await this.blocks(ctx as RequestContext<EventsBlocksRequest>,next);}
        );
    }

    private async blocks(ctx:RequestContext<EventsBlocksRequest>,next:Koa.Next){
        if(this.checkBlocksRequest(ctx)){
            const offset = ctx.request.body.offset ?? 0;
            const limit = ctx.request.body.limit ?? 50;

            const bestBlockNum = this.connex.thor.status.head.number;
            if(bestBlockNum < offset){
                ConvertJSONResponseMiddleware.BodyDataToJSONResponse(ctx,{
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
                ConvertJSONResponseMiddleware.BodyDataToJSONResponse(ctx,{
                    max_sequence:bestBlockNum,
                    events:events
                })
            }
        }
        await next();
    }

    private checkBlocksRequest(ctx: RequestContext<unknown>):boolean{
        const schema = Joi.object({
            offset:Joi.number().min(0).default(0),
            limit:Joi.number().min(1).max(100).default(100)
        });
        const verify = schema.validate(ctx.request.body,{allowUnknown:true});
        if(verify.error == undefined){
            return true;
        } else {
            ConvertJSONResponseMiddleware.KnowErrorJSONResponse(ctx,getError(21));
            return false;
        }
    }

    private env:Env;
    private verifyMiddleware:RequestInfoVerifyMiddleware;
    private connex:ConnexPro;
}