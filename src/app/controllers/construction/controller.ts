import Router from "koa-router";
import { NetworkType } from "../../../server/types/networkType";
import { BaseInfoService } from "../../../server/service/baseInfoService";
import { ActionResult, ActionResultWithData, ActionResultWithData2 } from "../../../utils/components/actionResult";
import { ConstructionMetaData } from "../../../server/types/constructionMetaData";
import { ConvertJSONResponeMiddleware } from "../../middleware/convertJSONResponeMiddleware";
import { BlockChainInfoService } from "../../../server/service/blockchainInfoService";
import * as Joi from 'joi';
import { RosettaErrorDefine } from "../../../server/types/rosettaError";
import { Operation, OperationType } from "../../../server/types/operation";
import { Transaction } from "thor-devkit/dist/transaction";
import { TransactionService } from "../../../server/service/transactionService";
import { HexStringHelper } from "../../../utils/helper/hexStringHelper";
import { Signature } from "../../../server/types/signature";
import { cry } from "thor-devkit";
import Secp256k1Ex from "../../../utils/helper/secp256k1Ex";
import { BaseController } from "../../../utils/components/baseController";
import { AccountIdentifier } from "../../../server/types/account";
import { RosettaTransaction, RosettaTransactionStruct } from "../../../server/types/rosettaTransaction";

export default class ConstructionController extends BaseController{

    public getConstructionMetadata:Router.IMiddleware;
    public submitTransaction:Router.IMiddleware;
    public createCombine: Router.IMiddleware;
    public derivePublickey: Router.IMiddleware;
    public getHash: Router.IMiddleware;
    public parseTransaction: Router.IMiddleware;
    public payloads: Router.IMiddleware;
    public preprocess: Router.IMiddleware;

    constructor(env:any){
        super(env);
        this._baseInfoService = new BaseInfoService(this.environment);
        this._blockChainInfoService = new BlockChainInfoService(this.environment);
        this._transactionService = new TransactionService(this.environment);

        this.getConstructionMetadata = async (ctx:Router.IRouterContext,next: () => Promise<any>)=>{
            let networkType = ctx.request.body.network_identifier.network == "main" ? NetworkType.MainNet : NetworkType.TestNet;
            let getConstructionResult = await this._baseInfoService.getConstructionMetadata(networkType);
            this._getConstructionMetadataConvertToJSONResult(ctx,getConstructionResult);
            await next();
            
        }

        this.submitTransaction = async (ctx:Router.IRouterContext,next: () => Promise<any>)=>{
            let networkType = ctx.request.body.network_identifier.network == "main" ? NetworkType.MainNet : NetworkType.TestNet;
            let rosettaRaw = HexStringHelper.ConvertToBuffer(ctx.request.body.signed_transaction);
            let txStruct = RosettaTransaction.decode(rosettaRaw);
            let submitTransactionResult = await this._blockChainInfoService.sendSignedTransaction(networkType,txStruct.raw);
            this._submitTransactionConvertToJSONResult(ctx,submitTransactionResult);
            await next();
        }
        
        this.createCombine = async (ctx: Router.IRouterContext, next: () => Promise<any>) => {
            let verifyResult = this._checkCreateCombineVerify(ctx);
            if(verifyResult.Result){
                try {
                    let rosettaRaw = HexStringHelper.ConvertToBuffer(ctx.request.body.unsigned_transaction);
                    let txStruct = RosettaTransaction.decode(rosettaRaw);
                    let transaction = Transaction.decode(HexStringHelper.ConvertToBuffer(txStruct.raw),true);
                    let signatures = ctx.request.body.signatures as Array<Signature>;
                    let signedResult = this._transactionService.signTransaction(transaction,signatures);
                    if(signedResult.Result && signedResult.Data){
                        let encodeRaw = transaction.encode();
                        let newTxStruct = new RosettaTransactionStruct("0x" + encodeRaw.toString('hex'),1,txStruct.origin,txStruct.delegator);
                        let raw = RosettaTransaction.encode(newTxStruct).toString('hex');
                        this._createCombineConvertToJsonResult(ctx,raw);
                    } else {
                        ConvertJSONResponeMiddleware.KnowErrorJSONResponce(ctx,signedResult.ErrorData);
                    }
                } catch (error) {
                    ConvertJSONResponeMiddleware.KnowErrorJSONResponce(ctx,RosettaErrorDefine.TRANSACTIONINVALID);
                }
            }
            await next();
        }

        this.derivePublickey = async (ctx: Router.IRouterContext, next: () => Promise<any>) => { 
            let verifyResult = this._checkPublickKeyPayloadVerify(ctx,ctx.request.body.public_key);
            if(verifyResult.Result){
                let publicKey = HexStringHelper.ConvertToBuffer(ctx.request.body.public_key.hex_bytes);
                if(publicKey.length == 33){
                    publicKey = Secp256k1Ex.toUncompress(publicKey);
                }
                let address = "0x" + cry.publicKeyToAddress(publicKey).toString('hex');
                this._derivePublickeyConvertToJsonResult(ctx,address);
            }
            await next();
        }

        this.getHash = async (ctx: Router.IRouterContext, next: () => Promise<any>) => {
            let verifyResult = this._checkHexStringVerify(ctx,ctx.request.body.signed_transaction);
            if(verifyResult.Result){
                try {
                    let rosettaRaw = HexStringHelper.ConvertToBuffer(ctx.request.body.signed_transaction);
                    let txStruct = RosettaTransaction.decode(rosettaRaw);
                    let transaction = Transaction.decode(HexStringHelper.ConvertToBuffer(txStruct.raw),txStruct.isSign == 1 ? false:true);
                    let checkChainTag = this._checkChainTag(ctx,transaction);
                    if(checkChainTag.Result){
                        this._getHexConvertToJsonResult(ctx,transaction.id!);
                    }else{
                        ConvertJSONResponeMiddleware.KnowErrorJSONResponce(ctx,RosettaErrorDefine.TRANSACTIONCHAINTAGINVALID);
                    }
                } catch (error) {
                    ConvertJSONResponeMiddleware.KnowErrorJSONResponce(ctx,RosettaErrorDefine.TRANSACTIONINVALID);
                }
            }
            await next();
        }

        this.parseTransaction = async (ctx: Router.IRouterContext, next: () => Promise<any>) => {
            let verifyResult = this._parseTransactionVerify(ctx);
            if(verifyResult.Result){
                try {
                    let signed = ctx.request.body.signed as boolean;
                    let rosettaRaw = HexStringHelper.ConvertToBuffer(ctx.request.body.transaction);
                    let txStruct = RosettaTransaction.decode(rosettaRaw);
                    let transaction = Transaction.decode(HexStringHelper.ConvertToBuffer(txStruct.raw),!signed);
                    let checkChainTag = this._checkChainTag(ctx,transaction);
                    if(checkChainTag.Result){
                        let parseResult = this._transactionService.parseTransaction(transaction,txStruct.origin,txStruct.delegator);
                        this._parseTransactionConvertToJsonResult(ctx,parseResult);
                    }else{
                        ConvertJSONResponeMiddleware.KnowErrorJSONResponce(ctx,RosettaErrorDefine.TRANSACTIONCHAINTAGINVALID);
                    }
                } catch (error) {
                    ConvertJSONResponeMiddleware.KnowErrorJSONResponce(ctx,RosettaErrorDefine.TRANSACTIONINVALID);
                }
            }
            await next();
        }

        this.payloads = async (ctx: Router.IRouterContext, next: () => Promise<any>) => {
            let operationsVerifyResult = this._operationVerify(ctx);
            let metadataVerifyResult = this._metadataVerify(ctx);
            if(operationsVerifyResult.Result && metadataVerifyResult.Result){
                let operations = ctx.request.body.operations as Array<Operation>;
                let metadata = ctx.request.body.metadata as ConstructionMetaData;
                let parseResult = this._transactionService.parseOperations(operations,metadata);
                if(parseResult.Result){
                    let transaction = new Transaction(parseResult.Data!);
                    let raw = "0x" + transaction.encode().toString('hex');
                    let txStruct = new RosettaTransactionStruct(raw,0,parseResult.Data2!,parseResult.Data3);
                    let unsigned_transaction = RosettaTransaction.encode(txStruct).toString("hex");
                    let originPayload:any = undefined;
                    let delegatorPayload:any = undefined;

                    if(parseResult.Data3 != null && (parseResult.Data3 as string).length == 42){
                        originPayload = {
                            address:parseResult.Data2,
                            hex_bytes:transaction.signingHash().toString('hex'),
                            signature_type:"ecdsa_recovery"
                        };

                        delegatorPayload = {
                            address:parseResult.Data3,
                            hex_bytes:transaction.signingHash(parseResult.Data2).toString('hex'),
                            signature_type:"ecdsa_recovery"
                        }
                    }else{
                        originPayload = {
                            address:parseResult.Data2,
                            hex_bytes:transaction.signingHash().toString('hex'),
                            signature_type:"ecdsa_recovery"
                        }
                    }
                    this._payloadsConvertToJsonResult(ctx,unsigned_transaction,originPayload,delegatorPayload);
                }
                else{
                    ConvertJSONResponeMiddleware.KnowErrorJSONResponce(ctx,parseResult.ErrorData);
                }
            }
            await next();
        }

        this.preprocess = async (ctx: Router.IRouterContext, next: () => Promise<any>) => {
            ConvertJSONResponeMiddleware.BodyDataToJSONResponce(ctx,{});
            await next();
        }
    }

    private _baseInfoService:BaseInfoService;
    private _blockChainInfoService:BlockChainInfoService;
    private _transactionService:TransactionService;

    private _getConstructionMetadataConvertToJSONResult(ctx:Router.IRouterContext,actionResult:ActionResultWithData<ConstructionMetaData>){
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

    private _checkCreateCombineVerify(ctx: Router.IRouterContext):ActionResult {
        let result = new ActionResult();
        let requestVerifySchema = Joi.object({
            unsigned_transaction:Joi.string().lowercase().regex(/^(-0x|0x)?[0-9a-f]*$/).required(),
            signatures:Joi.array().items(Joi.object({
                signing_payload:Joi.object({
                    address:Joi.string().lowercase().length(42).regex(/^(-0x|0x)?[0-9a-f]*$/).required(),
                    hex_bytes:Joi.string().lowercase().length(64).regex(/^(-0x|0x)?[0-9a-f]*$/).required(),
                    signature_type:Joi.string().valid("ecdsa_recovery")
                }),
                public_key:Joi.object({
                    hex_bytes:Joi.string().lowercase().length(66).regex(/^(-0x|0x)?[0-9a-f]*$/).required(),
                    curve_type:Joi.string().valid("secp256k1")
                }),
                signature_type:Joi.string().valid("ecdsa_recovery"),
                hex_bytes:Joi.string().lowercase().length(130).regex(/^(-0x|0x)?[0-9a-f]*$/).required()
            })).min(1).required(),
        });
        let verify = requestVerifySchema.validate(ctx.request.body,{allowUnknown:true});
        if(!verify.error){
            result.Result = true;
        }else{
            ConvertJSONResponeMiddleware.KnowErrorJSONResponce(ctx,RosettaErrorDefine.BADREQUEST);
            result.ErrorData = RosettaErrorDefine.BADREQUEST;
            result.Result = false;
        }
        return result;
    }

    private _createCombineConvertToJsonResult(ctx: Router.IRouterContext,sign:string){
        let response:any | undefined;
        response = {
            signed_transaction:sign
        }
        ConvertJSONResponeMiddleware.BodyDataToJSONResponce(ctx,response);
    }

    private _checkPublickKeyPayloadVerify(ctx: Router.IRouterContext, publickeyPayload: any):ActionResult {
        let result = new ActionResult();
        let requestVerifySchema = Joi.object({
            hex_bytes:Joi.alternatives().try(
                Joi.string().lowercase().length(130).regex(/^(-0x|0x)?[0-9a-f]*$/),
                Joi.string().lowercase().length(132).regex(/^(-0x|0x)?[0-9a-f]*$/),
                Joi.string().lowercase().length(66).regex(/^(-0x|0x)?[0-9a-f]*$/),
                Joi.string().lowercase().length(64).regex(/^(-0x|0x)?[0-9a-f]*$/)
            ),
            curve_type:Joi.string().valid("secp256k1").required()
        });
        let verify = requestVerifySchema.validate(publickeyPayload,{allowUnknown:true});
        if(!verify.error){
            result.Result = true;
        }else{
            ConvertJSONResponeMiddleware.KnowErrorJSONResponce(ctx,RosettaErrorDefine.PUBLICKEYPAYLOADINVALID);
            result.ErrorData = RosettaErrorDefine.PUBLICKEYPAYLOADINVALID;
            result.Result = false;
        }
        return result;
    }

    private _derivePublickeyConvertToJsonResult(ctx: Router.IRouterContext,address:string) {
        let response:any | undefined;
        response = {
            address:address,
            account_identifier:{
                address:address
            }
        }
        ConvertJSONResponeMiddleware.BodyDataToJSONResponce(ctx,response);
    }

    private _checkHexStringVerify(ctx: Router.IRouterContext,hexstring:any):ActionResult{
        let result = new ActionResult();
        let requestVerifySchema = Joi.string().lowercase().regex(/^(-0x|0x)?[0-9a-f]*$/).required();
        let verify = requestVerifySchema.validate(hexstring);
        if(!verify.error){
            result.Result = true;
        }else{
            ConvertJSONResponeMiddleware.KnowErrorJSONResponce(ctx,RosettaErrorDefine.TRANSACTIONISNOTHEX);
            result.ErrorData = RosettaErrorDefine.TRANSACTIONISNOTHEX;
            result.Result = false;
        }
        return result;
    }

    private _getHexConvertToJsonResult(ctx: Router.IRouterContext,hash:string) {
        let response:any | undefined;
        response = {
            transaction_identifier:{
                hash:hash
            }
        }
        ConvertJSONResponeMiddleware.BodyDataToJSONResponce(ctx,response);
    }

    private _parseTransactionVerify(ctx: Router.IRouterContext):ActionResult {
        let result = new ActionResult();
        let requestVerifySchema = Joi.object({
            signed:Joi.boolean().required(),
            transaction:Joi.string().lowercase().regex(/^(-0x|0x)?[0-9a-f]*$/).required()
        });
        let verify = requestVerifySchema.validate(ctx.request.body,{allowUnknown:true});
        if(!verify.error){
            result.Result = true;
        } else {
            ConvertJSONResponeMiddleware.KnowErrorJSONResponce(ctx,RosettaErrorDefine.INTERNALSERVERERROR);
            result.ErrorData = RosettaErrorDefine.INTERNALSERVERERROR;
            result.Result = false;
        }
        return result;
    }

    private _parseTransactionConvertToJsonResult(ctx: Router.IRouterContext,result:ActionResultWithData2<Array<Operation>,Array<string>>){
        if(result.Result){
            let response:any | undefined;

            if(result.Data){
                for(const operation of result.Data){
                    operation.operation_identifier.network_index = undefined;
                    operation.status = undefined;
                }
            }

            response = {
                operations:result.Data,
                signers:result.Data2
            }
            ConvertJSONResponeMiddleware.BodyDataToJSONResponce(ctx,response);
        }else{
            ConvertJSONResponeMiddleware.KnowErrorJSONResponce(ctx,result.ErrorData);
        }
    }

    private _operationVerify(ctx:Router.IRouterContext):ActionResult {
        let result = new ActionResult();
        let requestVerifySchema = Joi.array().items(Joi.object({
            operation_identifier:Joi.object({
                index:Joi.number().min(0).required(),
                network_index:Joi.number().min(0)
            }),
            type:Joi.string().valid(OperationType.None,OperationType.Transfer,OperationType.Fee,OperationType.FeeDelegation).required(),
            account:Joi.object({
                address:Joi.string().lowercase().length(42).regex(/^(-0x|0x)?[0-9a-f]*$/).required(),
                sub_account:Joi.object({
                    address:Joi.string().lowercase().length(42).regex(/^(-0x|0x)?[0-9a-f]*$/).required(),
                })
            }),
            amount:Joi.object({
                value:Joi.string().required(),
                currency:Joi.object({
                    symbol:Joi.string().required(),
                    decimals:Joi.number().min(0).required()
                })
            })
        }).required())
        let verify = requestVerifySchema.validate(ctx.request.body.operations,{allowUnknown:true});
        if(!verify.error){
            result.Result = true;
        }else{
            ConvertJSONResponeMiddleware.KnowErrorJSONResponce(ctx,RosettaErrorDefine.OPERATIONINVALID);
            result.ErrorData = RosettaErrorDefine.OPERATIONINVALID;
            result.Result = false;
        }

        return result;
    }

    private _metadataVerify(ctx:Router.IRouterContext):ActionResult{
        let result = new ActionResult();
        let requestVerifySchema = Joi.object({
            chainTag:Joi.number().valid(74,39).required(),
            blockRef:Joi.string().lowercase().length(18).regex(/^(-0x|0x)?[0-9a-f]*$/).required(),
            gasLimit:Joi.number().required()
        }).required();
        let verify = requestVerifySchema.validate(ctx.request.body.metadata,{allowUnknown:true});
        if(!verify.error){
            if((ctx.request.body.metadata.chainTag as number) == 0x4a && ctx.request.body.network_identifier.network == "main") {
                result.Result = true;
            } else if ((ctx.request.body.metadata.chainTag as number) == 0x27 && ctx.request.body.network_identifier.network == "test"){
                result.Result = true;
            } else {
                result.Result = false;
                result.ErrorData = RosettaErrorDefine.NETWORKINVALID;
                ConvertJSONResponeMiddleware.KnowErrorJSONResponce(ctx,RosettaErrorDefine.NETWORKINVALID);
            }
        }else{
            ConvertJSONResponeMiddleware.KnowErrorJSONResponce(ctx,RosettaErrorDefine.METADATAINVALID);
            result.ErrorData = RosettaErrorDefine.METADATAINVALID;
            result.Result = false;
        }

        return result;
    }

    private _payloadsConvertToJsonResult(ctx: Router.IRouterContext,unsigned_transaction:string,originPayload:any,delegatorPayload:any|undefined){
        let response:any | undefined;
        response = {
            unsigned_transaction:unsigned_transaction,
            payloads:new Array()
        };
        (response.payloads as Array<any>).push(originPayload);

        if(delegatorPayload != null){
            (response.payloads as Array<any>).push(delegatorPayload);
        }
        ConvertJSONResponeMiddleware.BodyDataToJSONResponce(ctx,response);
    }

    private _checkChainTag(ctx:Router.IRouterContext,transaction:Transaction):ActionResult{
        let result = new ActionResult();
        if(transaction.body.chainTag == 0x4a && ctx.request.body.network_identifier.network == "main"){
            result.Result = true;
        } else if(transaction.body.chainTag == 0x27 && ctx.request.body.network_identifier.network == "test"){
            result.Result = true;
        }
        return result;
    }
}