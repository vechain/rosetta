import axios from "axios";
import { randomBytes } from "crypto";
import { ethers } from "ethers";
import Joi from "joi";
import Router from "koa-router";
import { RLP, Transaction as VeTransaction } from "thor-devkit";
import { VETCurrency, VTHOCurrency } from "..";
import { CheckSchema } from "../common/checkSchema";
import { getError } from "../common/errors";
import { Currency } from "../common/types/currency";
import { Operation, OperationType } from "../common/types/operation";
import { CurveType, SignatureType } from "../common/types/signature";
import { ConvertJSONResponseMiddleware } from "../middlewares/convertJSONResponseMiddleware";
import { RequestInfoVerifyMiddleware } from "../middlewares/requestInfoVerifyMiddleware";
import ConnexPro from "../utils/connexPro";
import { VIP180Token } from "../utils/vip180Token";

export class Construction extends Router {
    constructor(env:any){
        super();
        this.env = env;
        this.connex = this.env.connex;
        this.tokenList = this.env.config.tokenlist;
        this.verifyMiddleware = new RequestInfoVerifyMiddleware(this.env);
        this.post('/construction/combine',
            async (ctx,next) => { await this.verifyMiddleware.checkNetwork(ctx,next);},
            async (ctx,next) => { await this.combine(ctx,next);}
        );

        this.post('/construction/derive',
            async (ctx,next) => { await this.verifyMiddleware.checkNetwork(ctx,next);},
            async (ctx,next) => { await this.derive(ctx,next);}
        );

        this.post('/construction/hash',
            async (ctx,next) => { await this.verifyMiddleware.checkNetwork(ctx,next);},
            async (ctx,next) => { await this.hash(ctx,next);}
        );

        this.post('/construction/metadata',
            async (ctx,next) => { await this.verifyMiddleware.checkNetwork(ctx,next);},
            async (ctx,next) => { await this.verifyMiddleware.checkRunMode(ctx,next);},
            async (ctx,next) => { await this.verifyMiddleware.checkModeNetwork(ctx,next);},
            async (ctx,next) => { await this.metadata(ctx,next);}
        );

        this.post('/construction/parse',
            async (ctx,next) => { await this.verifyMiddleware.checkNetwork(ctx,next);},
            async (ctx,next) => { await this.parse(ctx,next);}
        );

        this.post('/construction/payloads',
            async (ctx,next) => { await this.verifyMiddleware.checkNetwork(ctx,next);},
            async (ctx,next) => { await this.payloads(ctx,next);}
        );

        this.post('/construction/preprocess',
            async (ctx,next) => { await this.verifyMiddleware.checkNetwork(ctx,next);},
            async (ctx,next) => { await this.preprocess(ctx,next)},
        );

        this.post('/construction/submit',
            async (ctx,next) => { await this.verifyMiddleware.checkNetwork(ctx,next);},
            async (ctx,next) => { await this.verifyMiddleware.checkRunMode(ctx,next);},
            async (ctx,next) => { await this.verifyMiddleware.checkModeNetwork(ctx,next);},
            async (ctx,next) => { await this.submit(ctx,next);}
        );
    }

    private async derive(ctx:Router.IRouterContext,next: () => Promise<any>){
        const schema = Joi.object({
            public_key:Joi.object({
                hex_bytes:Joi.string().lowercase().length(66).regex(/^[0-9a-f]*$/).required(),
                curve_type:Joi.string().valid(CurveType.secp256k1).required()
            }).required()
        });
        const verify = schema.validate(ctx.request.body,{allowUnknown:true});
        if(verify.error == undefined){
            const account = this.computeAddress(ctx.request.body.public_key.hex_bytes as string);
            ConvertJSONResponseMiddleware.BodyDataToJSONResponse(ctx,{address:account});
        } else {
            ConvertJSONResponseMiddleware.KnowErrorJSONResponse(ctx,getError(5,undefined,{
                public_key:ctx.request.body.public_key,
                error:verify.error
            }));
            return;
        }
        await next();
    }

    private async preprocess(ctx:Router.IRouterContext,next: () => Promise<any>){
        const requestVerify = this.checkPreprocessRequest(ctx);
        if(requestVerify){
            const origins = this.getTxOrigins(ctx.request.body.operations);
            const delegator = ctx.request.body.metadata?.fee_delegator_account;
            const vetOpers = this.getVETOperations(ctx.request.body.operations);
            const tokensOpers = this.getTokensOperations(ctx.request.body.operations);
            if(origins.length > 1){
                ConvertJSONResponseMiddleware.KnowErrorJSONResponse(ctx,getError(6));
                return;
            } else if (origins.length == 0){
                ConvertJSONResponseMiddleware.KnowErrorJSONResponse(ctx,getError(7));
                return;
            } else if (vetOpers.length == 0 && tokensOpers.registered.length == 0){
                ConvertJSONResponseMiddleware.KnowErrorJSONResponse(ctx,getError(9));
                return;
            } else if(tokensOpers.unregistered.length > 0){
                const unregisteredToken = new Array<string>();
                for(const addr of tokensOpers.unregistered){
                    unregisteredToken.push(addr);
                }
                ConvertJSONResponseMiddleware.KnowErrorJSONResponse(ctx,getError(10,undefined,{
                    unregisteredToken:unregisteredToken
                }));
                return;
            }

            const clauses = new Array<VeTransaction.Clause>();
            for(const op of vetOpers){
                clauses.push({to:op.to,value:op.value,data:'0x'});
            }
            for(const op of tokensOpers.registered){
                clauses.push({to:op.token,value:'0',data:VIP180Token.encode('transfer',op.to,op.value)});
            }

            const response = {
                options:{clauses:clauses},
                required_public_keys:[
                    {address:origins[0]}
                ]
            }
            if(CheckSchema.isAddress(delegator) && delegator != origins[0]){
                response.required_public_keys.push({address:delegator});
            }
            ConvertJSONResponseMiddleware.BodyDataToJSONResponse(ctx,response);
        }
        await next();
    }

    private async getDynamicGasPrice():Promise<{
        baseFee: bigint,
        reward: bigint
    }> {
        const response = await axios.get(this.connex.baseUrl + '/fees/history?blockCount=1&newestBlock=best&rewardPercentiles=50');
        const lastBlockFees = response.data as {
            oldestBlock: string,
            baseFeePerGas: string[],
            gasUsedRatio: number[],
            reward: string[]
        };

        return {
            baseFee: BigInt(lastBlockFees.baseFeePerGas[0]),
            reward: BigInt(lastBlockFees.reward[0])
        }
    }

    private async metadata(ctx:Router.IRouterContext,next: () => Promise<any>){
        if(this.checkOptions(ctx)){
            try {
                const transactionType = ctx.request.body.options.transactionType;
                let gasPrice: bigint;
                let metadataFieldsByType;
                const dynamicGasPrice = await this.getDynamicGasPrice();
                if (transactionType == 'legacy' || dynamicGasPrice.baseFee == BigInt(0)) {
                    gasPrice = BigInt(this.env.config.baseGasPrice);
                    metadataFieldsByType = {
                        gasPriceCoef: randomBytes(1).readUInt8()
                    }
                } else {
                    gasPrice = dynamicGasPrice.baseFee + dynamicGasPrice.reward;
                    metadataFieldsByType = {
                        maxFeePerGas: gasPrice.toString(10),
                        maxPriorityFeePerGas: dynamicGasPrice.reward.toString(10)
                    }
                }
                let gas = await this.estimaterGasLocal((ctx.request.body.options.clauses as VeTransaction.Clause[]));
                gas = Math.ceil(gas * 1.2);
                const fee = this.gasToVTHO(gas,gasPrice);
                const blockRef = this.connex.blockRef;
                const chainTag = this.env.config.chainTag;
                const response = {
                    metadata:{
                        transactionType: ctx.request.body.options.transactionType,
                        blockRef,
                        chainTag,
                        gas,
                        nonce:'0x' + randomBytes(8).toString('hex'),
                        ...metadataFieldsByType
                    },
                    suggested_fee:[{
                        value:(fee * BigInt(-1)).toString(10),
                        currency:VTHOCurrency
                    }]
                }
                ConvertJSONResponseMiddleware.BodyDataToJSONResponse(ctx,response);
            } catch (error) {
                ConvertJSONResponseMiddleware.KnowErrorJSONResponse(ctx,getError(11,undefined,error));
                return;
            }
        }
        await next();
    }

    private async payloads(ctx:Router.IRouterContext,next:() => Promise<any>){
        if(this.checkOptions(ctx) && this.checkPublickeys(ctx) && this.checkMetadata(ctx)){
            let txOrigin;
            const txDelegator = ctx.request.body.metadata.fee_delegator_account;
            if(ctx.request.body.public_keys.length > 2){
                ConvertJSONResponseMiddleware.KnowErrorJSONResponse(ctx,getError(8));
                return;
            }
            if(txDelegator != undefined && ctx.request.body.public_keys.length != 2){
                ConvertJSONResponseMiddleware.KnowErrorJSONResponse(ctx,getError(28));
                return;
            }
            if(txDelegator != undefined){
                const dele = this.computeAddress(ctx.request.body.public_keys[1].hex_bytes as string).toLowerCase();
                if(dele != txDelegator){
                    ConvertJSONResponseMiddleware.KnowErrorJSONResponse(ctx,getError(29,undefined,{operation_account:txDelegator,public_key:ctx.request.body.public_keys[1].hex_bytes}));
                    return;
                }
            }

            const origins = this.getTxOrigins(ctx.request.body.operations);
            if(origins.length > 1){
                ConvertJSONResponseMiddleware.KnowErrorJSONResponse(ctx,getError(6));
                return;
            } else if(origins.length == 0){
                ConvertJSONResponseMiddleware.KnowErrorJSONResponse(ctx,getError(7));
                return;
            } else if(ctx.request.body.public_keys.length == 0){
                ConvertJSONResponseMiddleware.KnowErrorJSONResponse(ctx,getError(30));
                return;
            }
            if(origins.length == 1 && ctx.request.body.public_keys.length >= 1){
                const orig = this.computeAddress(ctx.request.body.public_keys[0].hex_bytes as string).toLowerCase();
                if(orig != origins[0]){
                    ConvertJSONResponseMiddleware.KnowErrorJSONResponse(ctx,getError(29,undefined,{operation_account:origins[0],public_key:ctx.request.body.public_keys[0].hex_bytes}));
                    return;
                } else {
                    txOrigin = origins[0];
                }
            }

            const clauses = this.convertOperationsToClauses(ctx.request.body.operations);

            let vechainTxBody
            const commonBody = {
                chainTag:ctx.request.body.metadata.chainTag as number,
                blockRef: ctx.request.body.metadata.blockRef as string,
                expiration:this.env.config.expiration as number,
                clauses:clauses,
                gas:ctx.request.body.metadata.gas,
                nonce: ctx.request.body.metadata.nonce || '0x' + randomBytes(8).toString('hex'),
                dependsOn:null
            }

            let encoder;
            if(ctx.request.body.metadata.transactionType == 'legacy'){
                vechainTxBody = {
                    ...commonBody,
                    type:VeTransaction.Type.Legacy,
                    gasPriceCoef:ctx.request.body.metadata.gasPriceCoef as number,
                } as VeTransaction.LegacyBody
                encoder = this.unsignedLegacyRosettaTxRlp;
            } else {
                vechainTxBody = {
                    ...commonBody,
                    type:VeTransaction.Type.DynamicFee,
                    maxFeePerGas:ctx.request.body.metadata.maxFeePerGas as string,
                    maxPriorityFeePerGas:ctx.request.body.metadata.maxPriorityFeePerGas as string,
                } as VeTransaction.DynamicFeeBody
                encoder = this.unsignedDynamicRosettaTxRlp;
            }

            if(CheckSchema.isAddress(txDelegator)){
                vechainTxBody.reserved = {
                    features:1
                }
            }

            const vechainTx = new VeTransaction(vechainTxBody);
            const originSignHash = vechainTx.signingHash().toString('hex');
            const rosettaTx = {
                origin:txOrigin,
                delegator: txDelegator,
                ...vechainTxBody
            }
            const rosettaTxRaw = encoder.encode(rosettaTx);
            const response = {
                unsigned_transaction:'0x' + rosettaTxRaw.toString('hex'),
                payloads:[
                    {
                        address:txOrigin,
                        hex_bytes:originSignHash,
                        signature_type:SignatureType.ecdsa_recovery
                    }
                ]
            }
            if(CheckSchema.isAddress(txDelegator)){
                const delegationSignHash = vechainTx.signingHash(txOrigin).toString('hex');
                response.payloads.push({
                    address:txDelegator,
                    hex_bytes:delegationSignHash,
                    signature_type:SignatureType.ecdsa_recovery
                });
            }
            ConvertJSONResponseMiddleware.BodyDataToJSONResponse(ctx,response)
        }
        await next();
    }

    private async submit(ctx:Router.IRouterContext,next: () => Promise<any>){
        let rosettaTx;
        try {
            rosettaTx = this.signedDynamicRosettaTxRlp.decode(Buffer.from(ctx.request.body.signed_transaction.substring(2),'hex'));
        } catch (error) {
            try {
                rosettaTx = this.signedLegacyRosettaTxRlp.decode(Buffer.from(ctx.request.body.signed_transaction.substring(2),'hex'));
            } catch (error) {
                ConvertJSONResponseMiddleware.KnowErrorJSONResponse(ctx,getError(12));
                return;
            }
        }

        let vechainTxBody;
        const commonBody = {
            chainTag:rosettaTx.chainTag,
            blockRef:rosettaTx.blockRef,
            expiration:rosettaTx.expiration,
            clauses:rosettaTx.clauses,
            gas:rosettaTx.gas,
            dependsOn:null,
            nonce:rosettaTx.nonce
        }
        // Legacy transaction
        if (rosettaTx.gasPriceCoef !== undefined) {
            vechainTxBody = {
                ...commonBody,
                type:VeTransaction.Type.Legacy,
                gasPriceCoef: rosettaTx.gasPriceCoef
            } as VeTransaction.LegacyBody
        } else {
            // Dynamic fee transaction
            vechainTxBody = {
                ...commonBody,
                type:VeTransaction.Type.DynamicFee,
                maxFeePerGas: rosettaTx.maxFeePerGas,
                maxPriorityFeePerGas: rosettaTx.maxPriorityFeePerGas
            } as VeTransaction.DynamicFeeBody
        }
        if(CheckSchema.isAddress(rosettaTx.delegator)){
            vechainTxBody.reserved = {features:1};
        }
        const vechainTx = new VeTransaction(vechainTxBody);
        vechainTx.signature = rosettaTx.signature;

        const raw = '0x' + vechainTx.encode().toString('hex');
        try {
            const response = await axios.post(this.connex.baseUrl + '/transactions',{raw:raw},{responseType:'json'});
            const txid = response.data.id;
            ConvertJSONResponseMiddleware.BodyDataToJSONResponse(ctx,{
                transaction_identifier:{
                    hash:txid
                }
            });
        } catch (error:any) {
            ConvertJSONResponseMiddleware.KnowErrorJSONResponse(ctx,getError(13,undefined,{status:error.response.status,error:error.response.data.trim(),raw:raw}));
            return;
        }
        await next();
    }

    private async parse(ctx:Router.IRouterContext,next: () => Promise<any>){
        if(this.checkParseRequest(ctx)){
            let rosettaTx;
            if(ctx.request.body.signed == true){
                try {
                    rosettaTx = this.signedDynamicRosettaTxRlp.decode(Buffer.from(ctx.request.body.transaction.substring(2),'hex'));
                } catch (error) {
                    try {
                        rosettaTx = this.signedLegacyRosettaTxRlp.decode(Buffer.from(ctx.request.body.transaction.substring(2),'hex'));
                    } catch (error) {
                        ConvertJSONResponseMiddleware.KnowErrorJSONResponse(ctx,getError(12));
                        return;
                    }
                }
            } else {
                try {
                    rosettaTx = this.unsignedDynamicRosettaTxRlp.decode(Buffer.from(ctx.request.body.transaction.substring(2),'hex'));
                } catch (error) {
                    try {
                        rosettaTx = this.unsignedLegacyRosettaTxRlp.decode(Buffer.from(ctx.request.body.transaction.substring(2),'hex'));
                    } catch (error) {
                        ConvertJSONResponseMiddleware.KnowErrorJSONResponse(ctx,getError(19));
                        return;
                    }
                }
            }
            const txOrigin = rosettaTx.origin as string;
            const delegator = rosettaTx.delegator as string
            let operations = new Array<Operation>();
            for(let index = 0; index < rosettaTx.clauses.length; index++){
                const clause = rosettaTx.clauses[index] as VeTransaction.Clause;
                if(clause.value == 0 || clause.value == ''){
                    const decode = VIP180Token.decodeCallData(clause.data,'transfer');
                    const token = this.tokenList.find( t => {return t.metadata.contractAddress.toLowerCase() == clause.to!.toLocaleLowerCase();})!;
                    const sendOp:Operation = {
                        operation_identifier:{
                            index:0,
                            network_index:index
                        },
                        type:OperationType.Transfer,
                        account:{
                            address:txOrigin
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
                            address:txOrigin
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

            const dynamicGasPrice = await this.getDynamicGasPrice();
            let gasPrice: bigint;
            // If the base fee is 0, it is a legacy transaction
            if (dynamicGasPrice.baseFee == BigInt(0)) {
                gasPrice = BigInt(this.env.config.baseGasPrice);
            } else {
                // If the base fee is not 0, it is a dynamic fee transaction
                gasPrice = dynamicGasPrice.baseFee + dynamicGasPrice.reward;
            }
            const amountValue = this.gasToVTHO(rosettaTx.gas,gasPrice);

            if(CheckSchema.isAddress(delegator)){
                const delegationOp:Operation = {
                    operation_identifier:{
                        index:0,
                        network_index:rosettaTx.clauses.length
                    },
                    type:OperationType.FeeDelegation,
                    account:{
                        address:delegator
                    },
                    amount:{
                        value:(amountValue * BigInt(-1)).toString(10),
                        currency:VTHOCurrency
                    }
                }
                operations.push(delegationOp)
            } else {
                const feeOp:Operation = {
                    operation_identifier:{
                        index:0,
                        network_index:rosettaTx.clauses.length + 1
                    },
                    type:OperationType.Fee,
                    account:{
                        address:txOrigin
                    },
                    amount:{
                        value:(amountValue * BigInt(-1)).toString(10),
                        currency:VTHOCurrency
                    }
                }
                operations.push(feeOp)
            }

            for(let index = 0; index < operations.length; index++){
                operations[index].operation_identifier.index = index;
            }

            let response;
            if(ctx.request.body.signed == true){
                response = {
                    operations:operations,
                    account_identifier_signers:[{
                        address:txOrigin
                    }]
                }
                if(CheckSchema.isAddress(delegator)){
                    response.account_identifier_signers.push({address:delegator});
                }
            } else {
                response = {
                    operations:operations
                }
            }
            ConvertJSONResponseMiddleware.BodyDataToJSONResponse(ctx,response);
        }
        await next();
    }

    private async combine(ctx:Router.IRouterContext,next: () => Promise<any>){
        if(this.checkCombineRequest(ctx)){
            let rosettaTx: any;
            try {
                rosettaTx = this.unsignedDynamicRosettaTxRlp.decode(Buffer.from(ctx.request.body.unsigned_transaction.substring(2),'hex'));
            } catch (error) {
                try {
                    rosettaTx = this.unsignedLegacyRosettaTxRlp.decode(Buffer.from(ctx.request.body.unsigned_transaction.substring(2),'hex'));
                } catch (error) {
                    ConvertJSONResponseMiddleware.KnowErrorJSONResponse(ctx,getError(19));
                    return;
                }
            }
            const originPayload = (ctx.request.body.signatures as Array<any>).find( p => {return (p.signing_payload.address || '').toLowerCase() == (rosettaTx.origin || '').toLowerCase()});
            const delegatorPayload = (ctx.request.body.signatures as Array<any>).find( p => {return (p.signing_payload.address || '').toLowerCase() == (rosettaTx.delegator || '').toLowerCase()});
            if(delegatorPayload != undefined){
                rosettaTx.signature = Buffer.concat([
                    Uint8Array.from(Buffer.from(originPayload.hex_bytes,'hex')),
                    Uint8Array.from(Buffer.from(delegatorPayload.hex_bytes,'hex'))
                ]);
            } else {
                rosettaTx.signature = Uint8Array.from(Buffer.from(originPayload.hex_bytes,'hex'));
            }
            let encoded;
            try {
                encoded = this.signedDynamicRosettaTxRlp.encode(rosettaTx);
            } catch (error) {
                try {
                    encoded = this.signedLegacyRosettaTxRlp.encode(rosettaTx);
                } catch (error) {
                    ConvertJSONResponseMiddleware.KnowErrorJSONResponse(ctx,getError(12));
                    return;
                }
            }
            ConvertJSONResponseMiddleware.BodyDataToJSONResponse(ctx,{signed_transaction:'0x' + encoded.toString('hex')});
        }
        await next();
    }

    private async hash(ctx:Router.IRouterContext,next: () => Promise<any>) {
        let rosettaTx;
        try {
            rosettaTx = this.signedDynamicRosettaTxRlp.decode(Buffer.from(ctx.request.body.signed_transaction.substring(2),'hex'));
        } catch (error) {
            try {
                rosettaTx = this.signedLegacyRosettaTxRlp.decode(Buffer.from(ctx.request.body.signed_transaction.substring(2),'hex'));
            } catch (error) {
                ConvertJSONResponseMiddleware.KnowErrorJSONResponse(ctx,getError(12));
                return;
            }
        }

        const commonBody = {
            chainTag:rosettaTx.chainTag,
            blockRef:rosettaTx.blockRef,
            expiration:rosettaTx.expiration,
            clauses:rosettaTx.clauses,
            gas:rosettaTx.gas,
            dependsOn:null,
            nonce:rosettaTx.nonce
        }

        let vechainTxBody;
        if(rosettaTx.gasPriceCoef != undefined){    
            vechainTxBody = {
                ...commonBody,
                type:VeTransaction.Type.Legacy,
                gasPriceCoef:rosettaTx.gasPriceCoef
            } as VeTransaction.LegacyBody;
        } else {
            vechainTxBody = {
                ...commonBody,
                type:VeTransaction.Type.DynamicFee,
                maxFeePerGas:rosettaTx.maxFeePerGas,
                maxPriorityFeePerGas:rosettaTx.maxPriorityFeePerGas
            } as VeTransaction.DynamicFeeBody;
        }
        if(CheckSchema.isAddress(rosettaTx.delegator)){
            vechainTxBody.reserved = {features:1};
        }
        const vechainTx = new VeTransaction(vechainTxBody);
        vechainTx.signature = rosettaTx.signature;

        ConvertJSONResponseMiddleware.BodyDataToJSONResponse(ctx,{
            transaction_identifier:{
                hash:vechainTx.id
            }
        });

        await next();
    }

    private checkPreprocessRequest(ctx: Router.IRouterContext):boolean {
        const schema = Joi.array().items(Joi.object({
            operation_identifier:Joi.object({
                index:Joi.number().min(0).required(),
                network_index:Joi.number().min(0)
            }).required(),
            type:Joi.string().valid(OperationType.Transfer,OperationType.Fee,OperationType.FeeDelegation).required(),
            account:Joi.object({
                address:Joi.string().lowercase().length(42).regex(/^(-0x|0x)?[0-9a-f]*$/).required(),
                sub_account:Joi.object({
                    address:Joi.string().lowercase().length(42).regex(/^(-0x|0x)?[0-9a-f]*$/)
                })
            }).required(),
            amount:Joi.object({
                value:Joi.string().required(),
                currency:Joi.object({
                    symbol:Joi.string().required(),
                    decimals:Joi.number().min(0).required()
                })
            }).required()
        })).min(1).required();
        const verify = schema.validate(ctx.request.body.operations,{allowUnknown:true});
        if(verify.error == undefined){
            return true;
        } else {
            ConvertJSONResponseMiddleware.KnowErrorJSONResponse(ctx,getError(14,undefined,{
                error:verify.error
            }));
            return false;
        }
    }

    private getTxOrigins(operations:Array<any>):string[] {
        const result = new Array<string>();
        const originMap = new Map<string,undefined>();
        const feeOpers = operations.filter(oper => {return oper.type == OperationType.Fee});
        const sendOpers = operations.filter( oper => {return oper.type == OperationType.Transfer && oper.amount.value != undefined && BigInt(oper.amount.value) < BigInt(0)});

        for(const oper of feeOpers){
            originMap.set(oper.account.address,undefined);
        }

        for(const oper of sendOpers){
            originMap.set(oper.account.address,undefined);
        }

        for(const addr of originMap.keys()){
            result.push(addr.toLocaleLowerCase());
        }
        return result;
    }

    private getTxDelegators(operations:Array<any>):string[] {
        const result = new Array<string>();
        const originMap = new Map<string,undefined>();
        const opers = operations.filter(oper => {return oper.type == OperationType.FeeDelegation});

        for(const oper of opers){
            originMap.set(oper.account.address,undefined);
        }

        for(const addr of originMap.keys()){
            result.push(addr.toLowerCase());
        }
        return result;
    }

    private getVETOperations(operations:Array<any>):Array<{value:string,to:string}> {
        let result = new Array<{value:'',to:''}>;
        const opers = operations.filter( oper => {
            return oper.amount.value != undefined && BigInt(oper.amount.value) > BigInt(0) && oper.amount.currency.symbol == 'VET' && oper.type == OperationType.Transfer;});
        if(opers.length > 0){
            opers.forEach(oper => {
                result.push({value:oper.amount.value,to:oper.account.address});
            });
        }
        return result;
    }

    private getTokensOperations(operations:Array<any>):{registered:Array<{token:string,value:string,to:string}>,unregistered:Array<string>} {
        let result ={registered:new Array(),unregistered:new Array()};
        for(const oper of operations){
            if(oper.amount.value != undefined && BigInt(oper.amount.value) > BigInt(0) && oper.type == OperationType.Transfer && oper.amount.currency?.metadata?.contractAddress != undefined){
                const tokenAddr = oper.amount.currency.metadata.contractAddress as string;
                const value = BigInt(oper.amount.value).toString(10);
                const to = oper.account.address;
                const tokenConf = this.tokenList.find(token => {return token.metadata.contractAddress.toLowerCase() == tokenAddr.toLowerCase();});
                if(tokenConf != undefined){
                    result.registered.push({token:tokenAddr,value:value,to:to});
                } else {
                    result.unregistered.push(tokenAddr);
                }
            }
        }
        return result;
    }

    private checkPublickeys(ctx:Router.IRouterContext):boolean {
        const schema = Joi.object({
            public_keys:Joi.array().items(Joi.object({
                hex_bytes:Joi.string().lowercase().length(66).regex(/^[0-9a-f]*$/).required(),
                curve_type:Joi.string().valid(CurveType.secp256k1).required()
            })).min(1).required()
        });
        const verify = schema.validate(ctx.request.body,{allowUnknown:true});
        if(verify.error == undefined){
            return true;
        } else {
            ConvertJSONResponseMiddleware.KnowErrorJSONResponse(ctx,getError(5,undefined,{
                error:verify.error
            }));
            return false;
        }
    }

    private checkOptions(ctx:Router.IRouterContext):boolean{
        if (!ctx.request.body.options) {
            ctx.request.body.options = {};
        }
        if (!ctx.request.body.options.transactionType) {
            ctx.request.body.options.transactionType = 'dynamic';
        }
        const schema = Joi.object({
            options:Joi.object({
                transactionType: Joi.string().valid('legacy', 'dynamic').default('dynamic'),
                clauses:Joi.array().items(Joi.object({
                    to:Joi.string().lowercase().length(42).regex(/^(-0x|0x)?[0-9a-f]*$/).required(),
                    value:Joi.string().allow('').required(),
                    data:Joi.string().allow('').required()
                })).min(1)
            })
        });
        const verify = schema.validate(ctx.request.body,{allowUnknown:true});
        if(verify.error == undefined){
            return true;
        } else {
            ConvertJSONResponseMiddleware.KnowErrorJSONResponse(ctx,getError(15,undefined,{
                error:verify.error
            }));
            return false;
        }
    }

    private async estimaterGasLocal(clauses:VeTransaction.Clause[]):Promise<number> {
        let result = 20000;
        for(const clause of clauses){
            if(clause.to?.toLocaleLowerCase() == VTHOCurrency.metadata.contractAddress.toLocaleLowerCase()) {
                result = result + 50000;
            } else {
                result = result + 10000;
            }
        }

        return result;
    }

    private checkMetadata(ctx:Router.IRouterContext):boolean{
        const schema = Joi.object({
            metadata:Joi.object({
                transactionType: Joi.string().valid('legacy', 'dynamic').default('dynamic'),
                blockRef:Joi.string().lowercase().length(18).regex(/^(-0x|0x)?[0-9a-f]*$/).required(),
                nonce:Joi.string().lowercase().length(18).regex(/^(0x)?[0-9a-f]+$/).optional(),
                chainTag:Joi.number().valid(this.env.config.chainTag).required(),
                gas:Joi.number().min(21000).required(),
                gasPriceCoef: Joi.when('transactionType', {
                    is: 'legacy',
                    then: Joi.number().min(0).max(255).required(),
                    otherwise: Joi.forbidden()
                }),
                maxFeePerGas: Joi.when('transactionType', {
                    is: 'dynamic',
                    then: Joi.number().min(this.env.config.initialBaseFee as number).required(),
                    otherwise: Joi.forbidden()
                }),
                maxPriorityFeePerGas: Joi.when('transactionType', {
                    is: 'dynamic',
                    then: Joi.number().min(0).required(),
                    otherwise: Joi.forbidden()
                }),
                fee_delegator_account:Joi.string().lowercase().length(42).regex(/^(-0x|0x)?[0-9a-f]*$/)
            })
        });
        const verify = schema.validate(ctx.request.body,{allowUnknown:true});
        if(verify.error == undefined){
            return true;
        } else {
            ConvertJSONResponseMiddleware.KnowErrorJSONResponse(ctx,getError(16,undefined,{
                error:verify.error
            }));
            return false;
        }
    }

    private convertOperationsToClauses(operations:Array<any>):VeTransaction.Clause[]{
        let result = new Array<VeTransaction.Clause>();
        const sorted = operations.sort((l,r) => {return l.operation_identifier.index - r.operation_identifier.index;});
        for(const oper of sorted){
            if(oper.amount.value != undefined && BigInt(oper.amount.value) > BigInt(0) && oper.amount.currency.symbol == 'VET' && oper.type == OperationType.Transfer){
                result.push({value:'0x' + BigInt(oper.amount.value).toString(16),to:oper.account.address,data:'0x'});
            }
            if(oper.amount.value != undefined && BigInt(oper.amount.value) > BigInt(0) && oper.type == OperationType.Transfer && oper.amount.currency?.metadata?.contractAddress != undefined){
                const tokenConf = this.tokenList.find(token => {return token.metadata.contractAddress == oper.amount.currency.metadata.contractAddress;});
                if(tokenConf != undefined){
                    result.push({value:'0',to:tokenConf.metadata.contractAddress,data:VIP180Token.encode('transfer',oper.account.address,oper.amount.value)})
                }
            }
        }
        return result;
    }

    private checkParseRequest(ctx: Router.IRouterContext):boolean{
        const schema = Joi.object({
            signed:Joi.boolean().required(),
            transaction:Joi.string().lowercase().regex(/^(-0x|0x)?[0-9a-f]*$/).required(),
        });
        const verify = schema.validate(ctx.request.body,{allowUnknown:true});
        if(verify.error == undefined){
            try {
                if(ctx.request.body.signed == true){
                    try {
                        this.signedDynamicRosettaTxRlp.decode(Buffer.from(ctx.request.body.transaction.substring(2),'hex'));
                    } catch (error) {
                        try {
                            this.signedLegacyRosettaTxRlp.decode(Buffer.from(ctx.request.body.transaction.substring(2),'hex'));
                        } catch (error) {
                            ConvertJSONResponseMiddleware.KnowErrorJSONResponse(ctx,getError(12));
                            return false;
                        }
                    }
                } else {
                    try {
                        this.unsignedDynamicRosettaTxRlp.decode(Buffer.from(ctx.request.body.transaction.substring(2),'hex'));
                    } catch (error) {
                        try {
                            this.unsignedLegacyRosettaTxRlp.decode(Buffer.from(ctx.request.body.transaction.substring(2),'hex'));
                        }
                        catch {
                            ConvertJSONResponseMiddleware.KnowErrorJSONResponse(ctx,getError(17,undefined,{
                                error:error
                            }));
                            return false;
                        }
                    }
                }
            } catch (error) {
                ConvertJSONResponseMiddleware.KnowErrorJSONResponse(ctx,getError(17,undefined,{
                    error:error
                }));
                return false;
            }
        } else {
            ConvertJSONResponseMiddleware.KnowErrorJSONResponse(ctx,getError(18,undefined,{
                error:verify.error
            }));
            return false;
        }
        return true;
    }

    private checkCombineRequest(ctx: Router.IRouterContext):boolean{
        const schema = Joi.object({
            unsigned_transaction:Joi.string().lowercase().regex(/^(-0x|0x)?[0-9a-f]*$/).required(),
            signatures:Joi.array().items(Joi.object({
                signing_payload:Joi.object({
                    account_identifier:Joi.object({
                        address:Joi.string().lowercase().length(42).regex(/^(-0x|0x)?[0-9a-f]*$/).required(),
                        sub_account:Joi.object({
                            address:Joi.string().lowercase().length(42).regex(/^(-0x|0x)?[0-9a-f]*$/)
                        })
                    }),
                    hex_bytes:Joi.string().lowercase().regex(/^(-0x|0x)?[0-9a-f]*$/),
                    signature_type:Joi.string().valid(SignatureType.ecdsa_recovery)
                }).required(),
                public_key:{
                    hex_bytes:Joi.string().lowercase().regex(/^(-0x|0x)?[0-9a-f]*$/).required(),
                    curve_type:Joi.string().valid(CurveType.secp256k1).required()
                },
                signature_type:Joi.string().valid(SignatureType.ecdsa_recovery).required(),
                hex_bytes:Joi.string().lowercase().regex(/^(-0x|0x)?[0-9a-f]*$/).required()
            })).min(1).required()
        });
        const verify = schema.validate(ctx.request.body,{allowUnknown:true});
        if(verify.error == undefined){
            try {
                this.unsignedDynamicRosettaTxRlp.decode(Buffer.from(ctx.request.body.unsigned_transaction.substring(2),'hex'));
            } catch (error) {
                try {
                    this.unsignedLegacyRosettaTxRlp.decode(Buffer.from(ctx.request.body.unsigned_transaction.substring(2),'hex'));
                } catch (error) {
                    ConvertJSONResponseMiddleware.KnowErrorJSONResponse(ctx,getError(19));
                    return false;
                }
            }
            return true;
        } else {
            ConvertJSONResponseMiddleware.KnowErrorJSONResponse(ctx,getError(20,undefined,{
                error:verify.error
            }));
            return false;
        }
    }

    private computeAddress(publickey:string):string {
        if(publickey.substring(2) != '0x'){
            publickey = '0x' +  publickey;
        }
        return ethers.utils.computeAddress(publickey).toLowerCase();
    }

    private gasToVTHO(gas:number, gasPrice:bigint):bigint {
        return BigInt(gas) * gasPrice;
    }
    

    private env:any;
    private connex:ConnexPro;
    private verifyMiddleware:RequestInfoVerifyMiddleware;
    private tokenList:Array<Currency> = new Array();

    private readonly commonRosettaTxRlpProfile: RLP.Profile = {
        name:'rosetta tx',
        kind:[
            {name:'chainTag',kind:new RLP.NumericKind(1)},
            {name:'blockRef',kind:new RLP.CompactFixedBlobKind(8)},
            {name:'expiration',kind:new RLP.NumericKind(4)},
            {name:'clauses',kind:{
                item:[
                    {name:'to',kind:new RLP.NullableFixedBlobKind(20)},
                    {name:'value',kind:new RLP.NumericKind(32)},
                    {name:'data',kind:new RLP.BlobKind()},
                ]
            }},
            {name:'gas',kind:new RLP.NumericKind(8)},
            {name:'nonce',kind:new RLP.NullableFixedBlobKind(8)},
            {name:'origin',kind:new RLP.NullableFixedBlobKind(20)},
            {name:'delegator',kind:new RLP.NullableFixedBlobKind(20)}
        ]
    };
    private readonly unsignedLegacyRosettaTxRlp = new RLP({
        ...this.commonRosettaTxRlpProfile,
        kind: [...this.commonRosettaTxRlpProfile.kind as Array<any>, { name: 'gasPriceCoef', kind: new RLP.NumericKind(1) }]
    });

    private readonly unsignedDynamicRosettaTxRlp = new RLP({
        ...this.commonRosettaTxRlpProfile,
        kind: [...this.commonRosettaTxRlpProfile.kind as Array<any>, 
            {name:'maxFeePerGas',kind:new RLP.NumericKind(32)},
            {name:'maxPriorityFeePerGas',kind:new RLP.NumericKind(32)},
        ]
    });

    private readonly signedLegacyRosettaTxRlp = new RLP({
        name: 'tx',
        kind: [...this.unsignedLegacyRosettaTxRlp.profile.kind as Array<any>, { name: 'signature', kind: new RLP.BufferKind() }],
    });

    private readonly signedDynamicRosettaTxRlp = new RLP({
        ...this.unsignedDynamicRosettaTxRlp.profile,
        kind: [...this.unsignedDynamicRosettaTxRlp.profile.kind as Array<any>, { name: 'signature', kind: new RLP.BufferKind() }],
    });
}
