import Joi from "joi";
import Router from "koa-router";
import { Transaction as VeTransaction } from "thor-devkit";
import { VETCurrency, VTHOCurrency } from "..";
import { CheckSchema } from "../common/checkSchema";
import { getError } from "../common/errors";
import { Currency } from "../common/types/currency";
import { BlockIdentifier } from "../common/types/identifiers";
import { Operation, OperationStatus, OperationType } from "../common/types/operation";
import { ConvertJSONResponseMiddleware } from "../middlewares/convertJSONResponseMiddleware";
import { RequestInfoVerifyMiddleware } from "../middlewares/requestInfoVerifyMiddleware";
import ConnexPro from "../utils/connexPro";
import { VIP180Token } from "../utils/vip180Token";

export class Search extends Router {
    constructor(env:any){
        super();
        this.env = env;
        this.connex = this.env.connex;
        this.verifyMiddleware = new RequestInfoVerifyMiddleware(this.env);
        this.tokenList = this.env.config.tokenlist;
        this.post('/search/transactions',
            async (ctx,next) => { await this.verifyMiddleware.checkNetwork(ctx,next);},
            async (ctx,next) => { await this.verifyMiddleware.checkRunMode(ctx,next);},
            async (ctx,next) => { await this.verifyMiddleware.checkModeNetwork(ctx,next);},
            async (ctx,next) => { await this.transactions(ctx,next);}
        );
    }

    private async transactions(ctx:Router.IRouterContext,next: () => Promise<any>){
        if(this.checkTxsRequest(ctx)){
            const txid = ctx.request.body.transaction_identifier.hash as string;
            const tx = await this.connex.thor.transaction(txid).get();
            const txRecp = await this.connex.thor.transaction(txid).getReceipt();
            if(tx != undefined){
                const block_identifier:BlockIdentifier = {
                    index:tx.meta.blockNumber,
                    hash:tx.meta.blockID
                }
                const operations = this.convertClausesToOperations(tx,txRecp);
                ConvertJSONResponseMiddleware.BodyDataToJSONResponse(ctx,{
                    transactions:[
                        {
                            block_identifier:block_identifier,
                            transaction:{
                                transaction_identifier:{
                                    hash:txid
                                }
                            },
                            operations:operations
                        }
                    ],
                    total_count:1
                })
            } else {
                ConvertJSONResponseMiddleware.KnowErrorJSONResponse(ctx,getError(4));
                return;
            }
        }
        await next();
    }

    private checkTxsRequest(ctx: Router.IRouterContext):boolean{
        const schema = Joi.object({
            transaction_identifier:Joi.object({
                hash:Joi.string().lowercase().length(66).regex(/^(-0x|0x)?[0-9a-f]*$/).required()
            }).required()
        }).required();
        const verify = schema.validate(ctx.request.body,{allowUnknown:true});
        if(verify.error == undefined){
            return true;
        } else {
            ConvertJSONResponseMiddleware.KnowErrorJSONResponse(ctx,getError(25,undefined,{
                error:verify.error
            }));
            return false;
        }
    }

    private convertClausesToOperations(tx:Connex.Thor.Transaction,txrecp?:Connex.Thor.Transaction.Receipt|null):Operation[] {
         let operations = new Array<Operation>();
         const origin = tx.origin;
         const delegator = tx.delegator;
         for(let index = 0; index < tx.clauses.length; index++){
            const clause = tx.clauses[index] as VeTransaction.Clause;
            if(clause.value == 0 || clause.value == ''){
                const token = this.tokenList.find( t => {return t.metadata.contractAddress == clause.to;})!;
                if(token == undefined || clause.data.substring(10) != '0xa9059cbb'){
                    continue;
                }
                const decode = VIP180Token.decodeCallData(clause.data,'transfer');
                const sendOp:Operation = {
                    operation_identifier:{
                        index:0,
                        network_index:index
                    },
                    type:OperationType.Transfer,
                    account:{
                        address:origin
                    },
                    amount:{
                        value:(BigInt(decode._amount) * BigInt(-1)).toString(10),
                        currency:token
                    }
                }
                const receiptOp:Operation = {
                    operation_identifier:{
                        index:0,
                        network_index:index
                    },
                    type:OperationType.Transfer,
                    account:{
                        address:decode._to as string
                    },
                    amount:{
                        value:BigInt(decode._amount).toString(10),
                        currency:token
                    }
                }

                operations = operations.concat([sendOp,receiptOp]);
            } else {
                const sendOp:Operation = {
                    operation_identifier:{
                        index:0,
                        network_index:index
                    },
                    type:OperationType.Transfer,
                    account:{
                        address:origin
                    },
                    amount:{
                        value:(BigInt(clause.value) * BigInt(-1)).toString(10),
                        currency:VETCurrency
                    }
                }
                const receiptOp:Operation = {
                    operation_identifier:{
                        index:0,
                        network_index:index
                    },
                    type:OperationType.Transfer,
                    account:{
                        address:clause.to as string,
                    },
                    amount:{
                        value:BigInt(clause.value).toString(10),
                        currency:VETCurrency
                    }
                }
                operations = operations.concat([sendOp,receiptOp]);
            }
        }
        
        if(CheckSchema.isAddress(delegator)){
            const payOp:Operation = {
                operation_identifier:{
                    index:0,
                    network_index:0
                },
                type:OperationType.FeeDelegation,
                account:{
                    address:delegator!
                },
                amount:{
                    value:(BigInt(tx.gas) * BigInt(10**18) / BigInt(this.env.config.baseGasPrice)*BigInt(-1)).toString(10),
                    currency:VTHOCurrency
                }
            }
            operations.push(payOp);
        }else {
            const payOp:Operation = {
                operation_identifier:{
                    index:0,
                    network_index:0
                },
                type:OperationType.Fee,
                account:{
                    address:origin
                },
                amount:{
                    value:(BigInt(tx.gas) * BigInt(10**18) / BigInt(this.env.config.baseGasPrice)*BigInt(-1)).toString(10),
                    currency:VTHOCurrency
                }
            }
            operations.push(payOp);
        }

        if(txrecp != undefined && txrecp != null){
            for(let oper of operations){
                oper.status = txrecp.reverted ? OperationStatus.Reverted : OperationStatus.Succeeded;
            }
            let payOp = operations.find( op => {return op.type == OperationType.Fee || op.type == OperationType.FeeDelegation;})!;
            payOp.amount!.value = (BigInt(txrecp.gasUsed) * BigInt(10**18) / BigInt(this.env.config.baseGasPrice)*BigInt(-1)).toString(10);
        }
        return operations;
    }

    private env:any;
    private connex:ConnexPro;
    private verifyMiddleware:RequestInfoVerifyMiddleware;
    private tokenList:Array<Currency> = new Array();
}