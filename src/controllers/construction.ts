import Joi, { valid } from "joi";
import Router from "koa-router";
import { address, RLP, Transaction as VeTransaction } from "thor-devkit";
import { VETCurrency, VTHO, VTHOCurrency } from "..";
import { Operation, OperationType } from "../common/types/operation";
import { CurveType, SignatureType } from "../common/types/signature";
import { Token } from "../common/types/token";
import { ConvertJSONResponeMiddleware } from "../middlewares/convertJSONResponeMiddleware";
import { RequestInfoVerifyMiddleware } from "../middlewares/requestInfoVerifyMiddleware";
import ConnexPro from "../utils/connexPro";
import { VIP180Token } from "../utils/vip180Token";
import axios from "axios";
import { getError } from "../common/errors";

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
                hex_bytes:Joi.string().lowercase().length(132).regex(/^(-0x|0x)?[0-9a-f]*$/).required(),
                curve_type:Joi.string().valid(CurveType.secp256k1).required()
            }).required()
        });
        const verify = schema.validate(ctx.request.body,{allowUnknown:true});
        if(verify.error == undefined){
            const pubkey = Buffer.from((ctx.request.body.public_key.hex_bytes as string).substring(2),'hex');
            const account = address.fromPublicKey(pubkey);
            ConvertJSONResponeMiddleware.BodyDataToJSONResponce(ctx,{address:account});
        } else {
            ConvertJSONResponeMiddleware.KnowErrorJSONResponce(ctx,getError(5,undefined,{
                public_key:ctx.request.body.public_key,
                error:verify.error
            }));
        }
        await next();
    }

    private async preprocess(ctx:Router.IRouterContext,next: () => Promise<any>){
        const requestVerify = this.checkPreprocessRequest(ctx);
        if(requestVerify){
            const origins = this.getTxOrigins(ctx.request.body.operations);
            const delegators = this.getTxDelegators(ctx.request.body.operations);
            const vetOpers = this.getVETOperations(ctx.request.body.operations);
            const tokensOpers = this.getTokensOperations(ctx.request.body.operations);
            if(origins.length > 1){
                ConvertJSONResponeMiddleware.KnowErrorJSONResponce(ctx,getError(6));
            } else if (origins.length == 0){
                ConvertJSONResponeMiddleware.KnowErrorJSONResponce(ctx,getError(7));
            } else if(delegators.length > 1) {
                ConvertJSONResponeMiddleware.KnowErrorJSONResponce(ctx,getError(8));
            } else if (vetOpers.length == 0 && tokensOpers.registered.length == 0){
                ConvertJSONResponeMiddleware.KnowErrorJSONResponce(ctx,getError(9));
            } else if(tokensOpers.unregistered.length > 0){
                const unregisteredToken = new Array<string>();
                for(const addr of tokensOpers.unregistered){
                    unregisteredToken.push(addr);
                }
                ConvertJSONResponeMiddleware.KnowErrorJSONResponce(ctx,getError(10,undefined,{
                    unregisteredToken:unregisteredToken
                }));
            }

            const clauses = new Array<VeTransaction.Clause>();
            for(const op of vetOpers){
                clauses.push({to:op.to,value:op.value,data:''});
            }
            for(const op of tokensOpers.registered){
                clauses.push({to:op.token,value:0,data:VIP180Token.encode('transfer',op.to,op.value)});
            }

            const response = {
                options:{clauses:clauses},
                required_public_keys:[
                    {address:origins[0]}
                ]
            }
            if(delegators.length == 1){
                response.required_public_keys.push({address:delegators[0]});
            }
            ConvertJSONResponeMiddleware.BodyDataToJSONResponce(ctx,response);
        }
        await next();
    }

    private async metadata(ctx:Router.IRouterContext,next: () => Promise<any>){
        if(this.checkPublickeys(ctx) && this.checkOptions(ctx)){
            const origin = address.fromPublicKey(Buffer.from(ctx.request.body.public_keys[0].hex_bytes.substring(2),'hex'));
            let delegator;
            if(ctx.request.body.public_keys.length == 2){
                delegator = address.fromPublicKey(Buffer.from(ctx.request.body.public_keys[1].hex_bytes.substring(2),'hex'));
            }
            try {
                let gas = await this.estimateGas((ctx.request.body.options.clauses as VeTransaction.Clause[]),origin,delegator);
                gas = gas * 1.2;
                const fee = BigInt(gas) * BigInt(10**18) / BigInt(this.connex.baseGasPrice);
                const blockRef = this.connex.blockRef;
                const chainTag = this.connex.chainTag;
                const response = {
                    metadata:{
                        blockRef:blockRef,
                        chainTag:chainTag,
                        gas:gas
                    }
                    // suggested_fee:[{
                    //     value:fee.toString(10),
                    //     currency:VTHOCurrency
                    // }]
                }
                ConvertJSONResponeMiddleware.BodyDataToJSONResponce(ctx,response);
            } catch (error) {
                ConvertJSONResponeMiddleware.KnowErrorJSONResponce(ctx,getError(11,undefined,error));
            }
        }
        await next();
    }

    private async payloads(ctx:Router.IRouterContext,next:() => Promise<any>){
        if(this.checkOptions(ctx) && this.checkPublickeys(ctx) && this.checkMetadata(ctx)){
            const origin = address.fromPublicKey(Buffer.from((ctx.request.body.public_keys[0].hex_bytes as string).substring(2),'hex'));
            let delegator;
            if(ctx.request.body.public_keys.length == 2){
                delegator = address.fromPublicKey(Buffer.from((ctx.request.body.public_keys[1].hex_bytes as string).substring(2),'hex'));
            }
            const clauses = this.convertOperationsToClauses(ctx.request.body.operations);

            const vechainTxBody:VeTransaction.Body = {
                chainTag:ctx.request.body.metadata.chainTag,
                blockRef:ctx.request.body.metadata.blockRef as string,
                expiration:this.env.config.expiration as number,
                clauses:clauses,
                gas:ctx.request.body.metadata.gas,
                nonce:'0x' + Math.random().toString(10).slice(-16),
                gasPriceCoef:0,
                dependsOn:null
            }
            if(delegator != null && delegator.length == 42){
                vechainTxBody.reserved = {
                    features:1
                }
            }
            const vechainTx = new VeTransaction(vechainTxBody);
            const signingHash = '0x' + vechainTx.signingHash((delegator != null && delegator.length == 42) ? origin : undefined).toString('hex');
            const rosettaTx = {
                chainTag:vechainTxBody.chainTag,
                blockRef:vechainTxBody.blockRef,
                expiration:vechainTxBody.expiration,
                clauses:vechainTxBody.clauses,
                gas:vechainTxBody.gas,
                nonce:vechainTxBody.nonce,
                origin:origin,
                delegator:delegator || undefined
            }
            const rosettaTxRaw = this.unsignedRosettaTransactionRlp.encode(rosettaTx);
            const response = {
                unsigned_transaction:'0x' + rosettaTxRaw.toString('hex'),
                payloads:[
                    {
                        address:origin,
                        hex_bytes:signingHash,
                        signature_type:SignatureType.ecdsa_recovery
                    }
                ]
            }
            if(delegator != null && delegator.length == 42){
                response.payloads.push({
                    address:delegator,
                    hex_bytes:signingHash,
                    signature_type:SignatureType.ecdsa_recovery
                });
            }
            ConvertJSONResponeMiddleware.BodyDataToJSONResponce(ctx,response)
        }
        await next();
    }

    private async submit(ctx:Router.IRouterContext,next: () => Promise<any>){
        let rosettaTx;
        try {
            rosettaTx = this.signedRosettaTransactionRlp.decode(Buffer.from(ctx.request.body.signed_transaction.substring(2),'hex'));
        } catch (error) {
            ConvertJSONResponeMiddleware.KnowErrorJSONResponce(ctx,getError(12));
        }
        let vechainTxBody:VeTransaction.Body = {
            chainTag:rosettaTx.chainTag,
            blockRef:rosettaTx.blockRef,
            expiration:rosettaTx.expiration,
            clauses:rosettaTx.clauses,
            gasPriceCoef:0,
            gas:rosettaTx.gas,
            dependsOn:null,
            nonce:rosettaTx.nonce
        }
        if(rosettaTx.delegator != undefined && rosettaTx.delegated.length == 42){
            vechainTxBody.reserved = {features:1};
        }
        const vechainTx = new VeTransaction(vechainTxBody);
        vechainTx.signature = rosettaTx.signature;
        const raw = '0x' + vechainTx.encode().toString('hex');
        try {
            const response = await axios.post(this.connex.baseUrl + '/transactions',{raw:raw},{responseType:'json'});
            const txid = response.data.id;
            ConvertJSONResponeMiddleware.BodyDataToJSONResponce(ctx,{
                transaction_identifier:{
                    hash:txid
                }
            });
        } catch (error) {
            ConvertJSONResponeMiddleware.KnowErrorJSONResponce(ctx,getError(13,undefined,error));
        }
        await next();
    }

    private async parse(ctx:Router.IRouterContext,next: () => Promise<any>){
        if(this.checkParseRequest(ctx)){
            let rosettaTx;
            if(ctx.request.body.signed == true){
                rosettaTx = this.signedRosettaTransactionRlp.decode(Buffer.from(ctx.request.body.transaction.substring(2),'hex'));
            } else {
                rosettaTx = this.unsignedRosettaTransactionRlp.decode(Buffer.from(ctx.request.body.transaction.substring(2),'hex'));
            }
            const origin = rosettaTx.origin as string;
            const delegator = rosettaTx.delegator as string
            let operations = new Array<Operation>();
            for(let index = 0; index < rosettaTx.clauses.length; index++){
                const clause = rosettaTx.clauses[index] as VeTransaction.Clause;
                if(clause.value == 0 || clause.value == ''){
                    const decode = VIP180Token.decodeCallData(clause.data,'transfer');
                    const token = this.tokenList.find( t => {return t.address == clause.to;})!;
                    const sendOp:Operation = {
                        operation_identifier:{
                            index:0,
                            network_index:index
                        },
                        type:OperationType.Transfer,
                        account:{
                            address:origin,
                            sub_account:{
                                address:clause.to!
                            }
                        },
                        amount:{
                            value:(BigInt(decode._amount) * BigInt(-1)).toString(10),
                            currency:{
                                symbol:token.symbol,
                                decimals:token.decimals,
                                metadata:{...token.metadata,contractAddress:token.address}
                            }
                        }
                    }
                    const receiptOp:Operation = {
                        operation_identifier:{
                            index:0,
                            network_index:index
                        },
                        type:OperationType.Transfer,
                        account:{
                            address:decode._to as string,
                            sub_account:{
                                address:clause.to!
                            }
                        },
                        amount:{
                            value:BigInt(decode._amount).toString(10),
                            currency:{
                                symbol:token.symbol,
                                decimals:token.decimals,
                                metadata:{...token.metadata,contractAddress:token.address}
                            }
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

            // if(delegator != null && delegator.length == 42){
            //     const payOp:Operation = {
            //         operation_identifier:{
            //             index:0,
            //             network_index:0
            //         },
            //         type:OperationType.FeeDelegation,
            //         account:{
            //             address:delegator,
            //             sub_account:{
            //                 address:VTHO.address,
            //             }
            //         },
            //         amount:{
            //             value:(BigInt(rosettaTx.gas) * BigInt(10**18) / BigInt(this.connex.baseGasPrice)*BigInt(-1)).toString(10),
            //             currency:VTHOCurrency
            //         }
            //     }
            //     operations.push(payOp);
            // } else {
            //     const payOp:Operation = {
            //         operation_identifier:{
            //             index:0,
            //             network_index:0
            //         },
            //         type:OperationType.Fee,
            //         account:{
            //             address:origin,
            //             sub_account:{
            //                 address:VTHO.address,
            //             }
            //         },
            //         amount:{
            //             value:(BigInt(rosettaTx.gas) * BigInt(10**18) / BigInt(this.connex.baseGasPrice)*BigInt(-1)).toString(10),
            //             currency:VTHOCurrency
            //         }
            //     }
            //     operations.push(payOp);
            // }

            for(let index = 0; index < operations.length; index++){
                operations[index].operation_identifier.index = index;
            }

            const response = {
                operations:operations,
                account_identifier_signers:[{
                    address:origin
                }]
            }
            if(delegator != undefined && delegator != ''){
                response.account_identifier_signers.push({
                    address:delegator
                });
            }
            ConvertJSONResponeMiddleware.BodyDataToJSONResponce(ctx,response);
        }
        await next();
    }

    private async combine(ctx:Router.IRouterContext,next: () => Promise<any>){
        if(this.checkCombineRequest(ctx)){
            let rosettaTx = this.unsignedRosettaTransactionRlp.decode(Buffer.from(ctx.request.body.unsigned_transaction.substring(2),'hex'));
            const originPayload = (ctx.request.body.signatures as Array<any>).find( p => {return (p.signing_payload.address || '').toLowerCase() == (rosettaTx.origin || '').toLowerCase()});
            const delegatorPayload = (ctx.request.body.signatures as Array<any>).find( p => {return (p.signing_payload.address || '').toLowerCase() == (rosettaTx.delegator || '').toLowerCase()});
            if(delegatorPayload != undefined){
                rosettaTx.signature = Buffer.concat([
                    Buffer.from(originPayload.hex_bytes.substring(2),'hex'),
                    Buffer.from(delegatorPayload.hex_bytes.substring(2),'hex')
                ]);
            } else {
                rosettaTx.signature = Buffer.from(originPayload.hex_bytes.substring(2),'hex');
            }
            const encode = this.signedRosettaTransactionRlp.encode(rosettaTx);
            ConvertJSONResponeMiddleware.BodyDataToJSONResponce(ctx,{signed_transaction:'0x' + encode.toString('hex')});
        }
        await next();
    }

    private async hash(ctx:Router.IRouterContext,next: () => Promise<any>) {
        try {
            const rosettaTx = this.signedRosettaTransactionRlp.decode(Buffer.from(ctx.request.body.signed_transaction.substring(2),'hex'));
            let vechainTxBody:VeTransaction.Body = {
                chainTag:rosettaTx.chainTag,
                blockRef:rosettaTx.blockRef,
                expiration:rosettaTx.expiration,
                clauses:rosettaTx.clauses,
                gasPriceCoef:0,
                gas:rosettaTx.gas,
                dependsOn:null,
                nonce:rosettaTx.nonce
            }
            if(rosettaTx.delegator != undefined && rosettaTx.delegated.length == 42){
                vechainTxBody.reserved = {features:1};
            }
            const vechainTx = new VeTransaction(vechainTxBody);
            vechainTx.signature = rosettaTx.signature;
            ConvertJSONResponeMiddleware.BodyDataToJSONResponce(ctx,{
                transaction_identifier:{
                    hash:vechainTx.id
                }
            });
        } catch (error) {
            ConvertJSONResponeMiddleware.KnowErrorJSONResponce(ctx,getError(12));
        }
        await next();
    }

    private checkPreprocessRequest(ctx: Router.IRouterContext):boolean {
        const schema = Joi.array().items(Joi.object({
            operation_identifier:Joi.object({
                index:Joi.number().min(0).required(),
                network_index:Joi.number().min(0).required()
            }).required(),
            type:Joi.string().valid(OperationType.Transfer,OperationType.Fee,OperationType.FeeDelegation).required(),
            account:Joi.object({
                address:Joi.string().lowercase().length(42).regex(/^(-0x|0x)?[0-9a-f]*$/).required(),
                sub_account:Joi.object({
                    address:Joi.string().lowercase().length(42).regex(/^(-0x|0x)?[0-9a-f]*$/).required(),
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
            ConvertJSONResponeMiddleware.KnowErrorJSONResponce(ctx,getError(14,undefined,{
                error:verify.error
            }));
        }
        return false;
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
            result.push(addr);
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
            result.push(addr);
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
            if(oper.amount.value != undefined && BigInt(oper.amount.value) > BigInt(0) && oper.type == OperationType.Transfer && oper.account.sub_account?.address != undefined){
                const tokenAddr = oper.account.sub_account.address as string;
                const value = BigInt(oper.amount.value).toString(10);
                const to = oper.account.address;
                const tokenConf = this.tokenList.find(token => {return token.address == tokenAddr;});
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
                hex_bytes:Joi.string().lowercase().length(132).regex(/^(-0x|0x)?[0-9a-f]*$/).required(),
                curve_type:Joi.string().valid(CurveType.secp256k1).required()
            })).min(1).required()
        });
        const verify = schema.validate(ctx.request.body,{allowUnknown:true});
        if(verify.error == undefined){
            return true;
        } else {
            ConvertJSONResponeMiddleware.KnowErrorJSONResponce(ctx,getError(5,undefined,{
                error:verify.error
            }));
        }
        return false;
    }

    private checkOptions(ctx:Router.IRouterContext):boolean{
        const schema = Joi.object({
            options:Joi.object({
                clauses:Joi.array().items(Joi.object({
                    to:Joi.string().lowercase().length(42).regex(/^(-0x|0x)?[0-9a-f]*$/).required(),
                    value:Joi.string().allow('').required(),
                    data:Joi.string().allow('').required()
                })).min(1).required()
            })
        });
        const verify = schema.validate(ctx.request.body,{allowUnknown:true});
        if(verify.error == undefined){
            return true;
        } else {
            ConvertJSONResponeMiddleware.KnowErrorJSONResponce(ctx,getError(15,undefined,{
                error:verify.error
            }));
        }
        return false;
    }

    private async estimateGas(clauses:VeTransaction.Clause[],origin:string,delegator?:string):Promise<number> {
        let result = 16000;
        try {
            const outputs = await this.connex.thor.explain(clauses).caller(origin).gasPayer(delegator || origin).execute();
            for(const output of outputs){
                result = result + (output.gasUsed != 0 ? output.gasUsed : 5000);
            }
        } catch (error) {
            throw new Error('estimateGas error ' + error);
        }
        return result;
    }

    private checkMetadata(ctx:Router.IRouterContext):boolean{
        const schema = Joi.object({
            metadata:Joi.object({
                blockRef:Joi.string().lowercase().length(18).regex(/^(-0x|0x)?[0-9a-f]*$/).required(),
                chainTag:Joi.number().valid(this.connex.chainTag).required(),
                gas:Joi.number().min(21000).required()
            })
        });
        const verify = schema.validate(ctx.request.body,{allowUnknown:true});
        if(verify.error == undefined){
            return true;
        } else {
            ConvertJSONResponeMiddleware.KnowErrorJSONResponce(ctx,getError(16,undefined,{
                error:verify.error
            }));
        }
        return false;
    }

    private convertOperationsToClauses(operations:Array<any>):VeTransaction.Clause[]{
        let result = new Array<VeTransaction.Clause>();
        const sorted = operations.sort((l,r) => {return l.operation_identifier.index - r.operation_identifier.index;});
        for(const oper of sorted){
            if(oper.amount.value != undefined && BigInt(oper.amount.value) > BigInt(0) && oper.amount.currency.symbol == 'VET' && oper.type == OperationType.Transfer){
                result.push({value:BigInt(oper.amount.value).toString(10),to:oper.account.address,data:'0x00'});
            }
            if(oper.amount.value != undefined && BigInt(oper.amount.value) > BigInt(0) && oper.type == OperationType.Transfer && oper.account.sub_account?.address != undefined){
                const tokenConf = this.tokenList.find(token => {return token.address == oper.account.sub_account.address;});
                if(tokenConf != undefined){
                    result.push({value:0,to:tokenConf.address,data:VIP180Token.encode('transfer',oper.account.address,oper.amount.value)})
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
                    this.signedRosettaTransactionRlp.decode(Buffer.from(ctx.request.body.transaction.substring(2),'hex'));
                } else {
                    this.unsignedRosettaTransactionRlp.decode(Buffer.from(ctx.request.body.transaction.substring(2),'hex'));
                }
            } catch (error) {
                ConvertJSONResponeMiddleware.KnowErrorJSONResponce(ctx,getError(17,undefined,{
                    error:error
                }));
            }
            return true;
        } else {
            ConvertJSONResponeMiddleware.KnowErrorJSONResponce(ctx,getError(18,undefined,{
                error:verify.error
            }));
        }
        return false;
    }

    private checkCombineRequest(ctx: Router.IRouterContext):boolean{
        const schema = Joi.object({
            unsigned_transaction:Joi.string().lowercase().regex(/^(-0x|0x)?[0-9a-f]*$/).required(),
            signatures:Joi.array().items(Joi.object({
                signing_payload:Joi.object({
                    account_identifier:Joi.object({
                        address:Joi.string().lowercase().length(42).regex(/^(-0x|0x)?[0-9a-f]*$/).required(),
                        sub_account:Joi.object({
                            address:Joi.string().lowercase().length(42).regex(/^(-0x|0x)?[0-9a-f]*$/).required()
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
                this.unsignedRosettaTransactionRlp.decode(Buffer.from(ctx.request.body.unsigned_transaction.substring(2),'hex'));
            } catch (error) {
                ConvertJSONResponeMiddleware.KnowErrorJSONResponce(ctx,getError(19));
            }
            return true;
        } else {
            ConvertJSONResponeMiddleware.KnowErrorJSONResponce(ctx,getError(20,undefined,{
                error:verify.error
            }));
        }
        return false;
    }
    

    private env:any;
    private connex:ConnexPro;
    private verifyMiddleware:RequestInfoVerifyMiddleware;
    private tokenList:Array<Token> = new Array();
    private readonly unsignedRosettaTransactionRlp = new RLP({
        name:'tx',
        kind:[
            {name:'chainTag',kind:new RLP.NumericKind(1)},
            {name:'blockRef',kind:new RLP.NullableFixedBlobKind(8)},
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
    });

    private readonly signedRosettaTransactionRlp = new RLP({
        name: 'tx',
        kind: [...this.unsignedRosettaTransactionRlp.profile.kind as Array<any>, { name: 'signature', kind: new RLP.BufferKind() }],
    });
}