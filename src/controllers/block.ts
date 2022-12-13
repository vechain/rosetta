import Router from "koa-router";
import { TransactionConverter } from "../common/transConverter";
import { BlockIdentifier } from "../common/types/identifiers";
import { Transaction } from "../common/types/transaction";
import { ConvertJSONResponeMiddleware } from "../middlewares/convertJSONResponeMiddleware";
import { RequestInfoVerifyMiddleware } from "../middlewares/requestInfoVerifyMiddleware";
import ConnexPro from "../utils/connexPro";
import { getError } from "../common/errors";


export class Block extends Router {
    constructor(env:any){
        super();
        this.env = env;
        this.connex = this.env.connex;
        this.transConverter = new TransactionConverter(this.env);
        this.verifyMiddleware = new RequestInfoVerifyMiddleware(this.env);
        this.post('/block',
            async (ctx,next) => { await this.verifyMiddleware.checkNetwork(ctx,next);},
            async (ctx,next) => { await this.verifyMiddleware.checkRunMode(ctx,next);},
            async (ctx,next) => { await this.verifyMiddleware.checkModeNetwork(ctx,next);},
            async (ctx,next) => { await this.verifyMiddleware.checkBlock(ctx,next);},
            async (ctx,next) => { await this.block(ctx,next)}
        );
        this.post('/block/transaction',
            async (ctx,next) => { await this.verifyMiddleware.checkNetwork(ctx,next);},
            async (ctx,next) => { await this.verifyMiddleware.checkRunMode(ctx,next);},
            async (ctx,next) => { await this.verifyMiddleware.checkModeNetwork(ctx,next);},
            async (ctx,next) => { await this.verifyMiddleware.checkBlock(ctx,next);},
            async (ctx,next) => { await this.verifyMiddleware.checkTransaction(ctx,next);},
            async (ctx,next) => { await this.blockTransaction(ctx,next)}
        );
    }

    private async block(ctx:Router.IRouterContext,next: () => Promise<any>){
        let revision = undefined;
        if(ctx.request.body.block_identifier.index != undefined){
            revision = ctx.request.body.block_identifier.index;
        } else if (ctx.request.body.block_identifier.hash != undefined){
            revision = ctx.request.body.block_identifier.hash;
        }

        if(revision == undefined){
            ConvertJSONResponeMiddleware.KnowErrorJSONResponce(ctx,getError(24,undefined));
            return;
        }

        try {
            const block = await this.connex.thor.block(revision).get();
            if(block != null){
                let parent = (await this.connex.thor.block(block.parentID).get())!;
                if(block.number == 0){
                    parent = (await this.connex.thor.block(0).get())!;
                }
                let trans = new Array<Transaction>();
                let other_trans = new Array<{hash:string}>();
                for(const txid of block.transactions){
                    const rosettaTx = await this.transConverter.parseRosettaTransacion(txid);
                    if(rosettaTx.operations.length > 0){
                        trans.push(await this.transConverter.parseRosettaTransacion(txid));
                    } else {
                        other_trans.push({hash:rosettaTx.transaction_identifier.hash});
                    }
                }
                const response:{
                    block:{
                        block_identifier:BlockIdentifier,
                        parent_block_identifier:BlockIdentifier,
                        timestamp:number,
                        transactions:Transaction[]
                    },
                    other_transactions:Array<{hash:string}> | undefined
                } = {
                    block:{
                        block_identifier:{
                            index:block.number,
                            hash:block.id
                        },
                        parent_block_identifier:{
                            index:parent.number,
                            hash:parent.id
                        },
                        timestamp:block.timestamp * 1000,
                        transactions:trans
                    },
                    other_transactions:other_trans.length > 0 ? other_trans : undefined
                }
                ConvertJSONResponeMiddleware.BodyDataToJSONResponce(ctx,response);
            } else {
                ConvertJSONResponeMiddleware.KnowErrorJSONResponce(ctx,getError(3,undefined,{
                    revision:revision
                }));
            }
        } catch (error) {
            ConvertJSONResponeMiddleware.KnowErrorJSONResponce(ctx,getError(500,undefined,{error}));
        }
        await next();
    }

    private async blockTransaction(ctx:Router.IRouterContext,next: () => Promise<any>){
        let revision = undefined;
        if(ctx.request.body.block_identifier?.hash != undefined){
            revision = ctx.request.body.block_identifier.hash;
        } else {
            revision = ctx.request.body.block_identifier.index;
        }

        const txid = ctx.request.body.transaction_identifier.hash;

        if(revision == undefined){
            ConvertJSONResponeMiddleware.KnowErrorJSONResponce(ctx,getError(24,undefined));
            return;
        }

        try {
            const block = await this.connex.thor.block(revision).get();
            if(block != null){
                const txRece = (await this.connex.thor.transaction(txid).getReceipt());
                    if(txRece != null && txRece.meta.blockID.toLowerCase() == block.id.toLowerCase()){
                    const rosettaTx = await this.transConverter.parseRosettaTransacion(txid);
                    const response:{transaction:Transaction} = {
                        transaction:rosettaTx
                    }
                    ConvertJSONResponeMiddleware.BodyDataToJSONResponce(ctx,response);
                } else {
                    ConvertJSONResponeMiddleware.KnowErrorJSONResponce(ctx,getError(4,undefined,{
                        transaction_identifier_hash:txid
                    }));
                }
            } else {
                ConvertJSONResponeMiddleware.KnowErrorJSONResponce(ctx,getError(3,undefined,{
                    block_identifier_hash:revision || ''
                }));
            }
        } catch (error) {
            ConvertJSONResponeMiddleware.KnowErrorJSONResponce(ctx,getError(500,undefined,error));
        }
        await next();
    }

    private env:any;
    private connex:ConnexPro;
    private verifyMiddleware:RequestInfoVerifyMiddleware;
    private transConverter:TransactionConverter;
}