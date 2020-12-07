import { GlobalEnvironment } from "../../app/globalEnvironment";
import { Transaction } from "thor-devkit";
import { ActionResultWithData, ActionResultWithData2, ActionResultWithData3, ActionResult } from "../../utils/components/actionResult";
import { Operation, OperationType, OperationStatus } from "../types/operation";
import { AccountIdentifier, SubAccountIdentifier } from "../types/account";
import { Amount } from "../types/amount";
import { BigNumberEx } from "../../utils/helper/bigNumberEx";
import { NetworkType } from "../types/networkType";
import { RosettaErrorDefine } from "../types/rosettaError";
import VIP180Helper from "../../utils/helper/vip180Helper";
import { ConstructionMetaData } from "../types/constructionMetaData";
import { randomBytes } from 'crypto';
import { Signature } from "../types/signature";
import { HexStringHelper } from "../../utils/helper/hexStringHelper";
import { secp256k1 } from "thor-devkit/dist/cry/secp256k1";
import { publicKeyToAddress } from "thor-devkit/dist/cry/address";
import Secp256k1Ex from "../../utils/helper/secp256k1Ex";

export class TransactionService {
    private _environment: GlobalEnvironment;

    constructor(environment: GlobalEnvironment) {
        this._environment = environment;
    }

    public parseTransaction(transaction: Transaction,origin:string,delegator?:string): ActionResultWithData2<Array<Operation>, Array<string>> {
        let result = new ActionResultWithData2<Array<Operation>, Array<string>>();
        result.Data = new Array<Operation>();
        result.Data2 = new Array<string>();
        var type = transaction.body.chainTag == 0x4a ? NetworkType.MainNet : NetworkType.TestNet;

        for (var index = 0; index < transaction.body.clauses.length; index++) {
            let parseTransfer = this._parseClause(transaction.body.clauses[index], transaction,type,origin,delegator);
            if (!parseTransfer.Result) {
                result.copyBase(parseTransfer);
                return result;
            }
            for (var operation of parseTransfer.Data!) {
                operation.operation_identifier.network_index = index;
                result.Data.push(operation);
            }
        }

        // update operation_identifier index
        var index = 0;
        for (var operation of result.Data) {
            operation.operation_identifier.index = index;
            index++;
        }

        // // parse fee or feedelegation operation
        // var parseFeeOp = this._parseFeeOperation(transaction,origin,delegator);
        // // the fee or feedelegation operation is last operation in list
        // if (parseFeeOp) {
        //     parseFeeOp.operation_identifier.index = index;
        //     parseFeeOp.operation_identifier.network_index = undefined;
        //     result.Data.push(parseFeeOp);
        // }

        if (transaction.origin != null) {
            result.Data2.push(transaction.origin);
        }

        if (transaction.delegator != null) {
            result.Data2.push(transaction.delegator);
        }

        result.Result = true;
        return result;
    }

    public parseOperations(operations: Array<Operation>, metadata: ConstructionMetaData): ActionResultWithData3<Transaction.Body, string, string> {
        let result = new ActionResultWithData3<Transaction.Body, string, string>();
        var sortOperations = operations.sort((a, b) => { return a.operation_identifier.index! - b.operation_identifier.index! });

        let checkResult = this.checkOperations(operations);
        if(!checkResult.Result){
            result.copyBase(checkResult); 
            return result;
        }

        var nonce = "0x" + randomBytes(8).toString('hex');
        var body: Transaction.Body = {
            chainTag: metadata.chainTag,
            blockRef: metadata.blockRef,
            expiration: this._environment.config.expiration,    // set default expiration
            clauses: new Array(),
            gasPriceCoef: this._environment.config.gasPriceCoef, // set default gasPriceCoef
            gas: 0,
            dependsOn: null,
            nonce: nonce as string,
            reserved: undefined
        };

        for (var operation of sortOperations) {
            if(operation.type == OperationType.Transfer && !operation.amount!.value.startsWith('-')){
                let parseResult = this._parseToClause(operation);
                if (!parseResult.Result) {
                    result.copyBase(parseResult);
                    return result;
                }
                body.clauses.push(parseResult.Data!);
                body.gas = (body.gas as number) + parseResult.Data2!    //auto calculate gas
            }
        }

        // Minus the transction base gas
        if(body.gas > 21000){
            body.gas = (body.gas as number) - ((body.clauses.length -1) * 15000); 
        }

        // Check tx total gas.
        if(body.gas > metadata.gasLimit){
            result.Result = false;
            result.ErrorData = RosettaErrorDefine.OPERATIONSTOOMUCH;
            return result;
        }

        var originOperation = operations.filter(operation => { return operation.amount!.value.startsWith("-"); })[0];
        result.Data2 = originOperation.account!.address;

        var delegatorOperation = operations.filter(operation => { return operation.type == OperationType.FeeDelegation; })[0];
        if (delegatorOperation != null) {
            result.Data3 = delegatorOperation.account!.address;
            body.reserved = {
                features: 1
            }
        }
        result.Data = body;
        result.Result = true;
        return result;
    }

    public signTransaction(transaction: Transaction, signatures: Array<Signature>): ActionResultWithData<string> {
        let result = new ActionResultWithData<string>();
        if (transaction.delegated) {
            if (signatures.length == 2) {
                result = this._signVIP191Transaction(transaction, signatures);
            } else {
                result.ErrorData = RosettaErrorDefine.NOSETDELEGATORSINGTURE;
                result.Result = false;
            }
        } else {
            result = this._signTransaction(transaction, signatures[0]);
        }
        return result;
    }

    public getOperationAccount(operations: Array<Operation>):ActionResultWithData<Array<AccountIdentifier>>{
        let result = new ActionResultWithData<Array<AccountIdentifier>>();
        result.Data = new Array<AccountIdentifier>();

        let checkResult = this.checkOperations(operations);
        if(!checkResult.Result){
            result.copyBase(checkResult); 
            return result;
        }

        let originOperations = operations.filter(operation =>{
            return operation.type == OperationType.Transfer && operation.amount!.value.startsWith('-');
        });
        result.Data.push(originOperations[0].account!);

        let delegatorOperations = operations.filter(operation =>{
            return operation.type = OperationType.FeeDelegation;
        });

        if(delegatorOperations.length == 1){
            result.Data.push(delegatorOperations[0].account!);
        }

        result.Result = true;

        return result;
    }

    public checkOperations(operations: Array<Operation>):ActionResult{
        let result = new ActionResult();
        result.Result = true;

        let originOperations = operations.filter(operation =>{
            return operation.type == OperationType.Transfer && operation.amount!.value.startsWith('-');
        });

        if(originOperations.length == 0){
            result.ErrorData = RosettaErrorDefine.NOSETORIGIN;
            result.Result = false;
        }

        let origin = originOperations[0].account!.address;

        if((originOperations.filter(operation =>{
            return operation.account!.address != origin;
        })).length != 0){
            result.ErrorData = RosettaErrorDefine.MULTIORIGIN;
            result.Result = false;
        }

        let delegatorOperations = operations.filter(operation =>{
            return operation.type == OperationType.FeeDelegation;
        });

        if(delegatorOperations.length > 1){
            result.ErrorData = RosettaErrorDefine.MULTIDELEGATOR;
            result.Result = false;
        }

        return result;
    }

    private _parseClause(clause: Transaction.Clause, transaction: Transaction,type: NetworkType,origin:string,delegator?:string): ActionResultWithData<Array<Operation>> {
        let result = new ActionResultWithData<Array<Operation>>();
        result.Data = new Array<Operation>();
        if (clause.to != null) {
            // parse VET transfer clause to VET operation
            var parseVET = this._parseVETOperation(clause, transaction,origin);
            if (!parseVET.Result) {
                result.copyBase(parseVET);
                return result;
            }

            if (parseVET.Data != null) {
                for (var oper of parseVET.Data) {
                    result.Data.push(oper);
                }
            }

            // parse VIP180 transfer clause to VIP180 operation (no support VIP180 transferfrom function)
            var parseVIP180 = this._parseVIP180TokenOperation(clause, transaction, type,origin);
            if (!parseVIP180.Result) {
                result.copyBase(parseVIP180);
                return result;
            }

            if (parseVIP180.Data != null) {
                for (var oper of parseVIP180.Data) {
                    result.Data.push(oper);
                }
            }

            // let feeOperation = this._parseFeeOperation(transaction,origin,delegator);
            // if(feeOperation){
            //     result.Data.push(feeOperation);
            // }

            result.Result = true;
        } else {
            result.Result = false;
            result.ErrorData = RosettaErrorDefine.TRANSACTIONNOTSUPPORT;
            return result;
        }
        return result;
    }

    private _parseVETOperation(clause: Transaction.Clause, transaction: Transaction,origin:string): ActionResultWithData<Array<Operation>> {
        let result = new ActionResultWithData<Array<Operation>>();
        result.Data = new Array<Operation>();

        if (clause.value != null && clause.value != 0) {
            let receiptOp = new Operation();
            receiptOp.type = OperationType.Transfer;
            receiptOp.status = OperationStatus.None;
            receiptOp.account = new AccountIdentifier();
            receiptOp.account.address = clause.to!;
            receiptOp.amount = Amount.CreateVET();
            receiptOp.amount.value = (new BigNumberEx(clause.value)).toString();
            result.Data.push(receiptOp);

            let originOp = new Operation();
            originOp.type = OperationType.Transfer;
            originOp.status = OperationStatus.None;
            originOp.account = new AccountIdentifier();
            originOp.account.address = origin;
            originOp.amount = Amount.CreateVET();
            originOp.amount.value = (new BigNumberEx(clause.value)).multipliedBy(-1).toString();
            result.Data.push(originOp);
        }
        result.Result = true;
        return result;
    }

    private _parseVIP180TokenOperation(clause: Transaction.Clause, transaction: Transaction, type: NetworkType,origin:string): ActionResultWithData<Array<Operation>> {
        let result = new ActionResultWithData<Array<Operation>>();
        result.Data = new Array<Operation>();

        var vip180Tokens = this._environment.getVIP180TokenList();
        var filterToken = vip180Tokens.filter(token => { return token.address.toLowerCase() === clause.to!.toLocaleLowerCase() });
        if (filterToken.length != 0 && clause.data.substr(0, 10) === "0xa9059cbb") {
            var tokenConfig = filterToken[0];
            // decode VIP180 transfer input parames
            var decodeResult = VIP180Helper.decodeTransferCall(clause.data);
            if (decodeResult.Result) {
                let receiptOp = new Operation();
                receiptOp.type = OperationType.Transfer;
                receiptOp.status = OperationStatus.None;
                receiptOp.account = new AccountIdentifier();
                receiptOp.account.address = decodeResult.Data!;
                receiptOp.account.sub_account = new SubAccountIdentifier();
                receiptOp.account.sub_account.address = clause.to!;
                receiptOp.amount = new Amount();
                receiptOp.amount.currency = tokenConfig;
                receiptOp.amount.value = decodeResult.Data2!.toString();
                result.Data.push(receiptOp);

                let originOp = new Operation();
                originOp.type = OperationType.Transfer;
                originOp.status = OperationStatus.None;
                originOp.account = new AccountIdentifier();
                originOp.account.address = origin;
                originOp.account.sub_account = new SubAccountIdentifier();
                originOp.account.sub_account.address = clause.to!;
                originOp.amount = new Amount();
                originOp.amount.currency = tokenConfig;
                originOp.amount.value = decodeResult.Data2!.times(-1).toString();

                result.Data.push(originOp);
                result.Result = true;
            }
            else {
                result.copyBase(decodeResult);
            }
        }
        else {
            result.Result = true;
        }
        return result;
    }

    private _parseFeeOperation(transaction: Transaction,origin:string,delegator?:string): Operation {
        let result = new Operation();
        if (transaction.origin != null || transaction.delegator != null || transaction.delegated) {
            if (transaction.delegated) {
                if (delegator != null) {
                    let operation = new Operation();
                    operation.type = OperationType.FeeDelegation;
                    operation.status = OperationStatus.None;
                    operation.account = new AccountIdentifier();
                    operation.account.address = delegator;
                    operation.account.sub_account = new SubAccountIdentifier();
                    operation.account.sub_account.address = this._environment.getVTHOConfig().address;
                    operation.amount = Amount.CreateVTHO();
                    operation.amount.value = (new BigNumberEx(transaction.body.gas)).dividedBy(1000).multipliedBy(Math.pow(10, operation.amount.currency.decimals)).multipliedBy(-1).toString();
                    result = operation;
                } else {
                    let operation = new Operation();
                    operation.type = OperationType.FeeDelegation;
                    operation.status = OperationStatus.None;
                    operation.account = new AccountIdentifier();
                    operation.account.address = "";
                    operation.account.sub_account = new SubAccountIdentifier();
                    operation.account.sub_account.address = this._environment.getVTHOConfig().address;
                    operation.amount = Amount.CreateVTHO();
                    operation.amount.value = (new BigNumberEx(transaction.body.gas)).dividedBy(1000).multipliedBy(Math.pow(10, operation.amount.currency.decimals)).multipliedBy(-1).toString();
                    result = operation;
                }
            } else if (origin != null) {
                let operation = new Operation();
                operation.type = OperationType.Fee;
                operation.status = OperationStatus.None;
                operation.account = new AccountIdentifier();
                operation.account.address = origin;
                operation.account.sub_account = new SubAccountIdentifier();
                operation.account.sub_account.address = this._environment.getVTHOConfig().address;
                operation.amount = Amount.CreateVTHO();
                operation.amount.value = (new BigNumberEx(transaction.body.gas)).dividedBy(1000).multipliedBy(Math.pow(10, operation.amount.currency.decimals)).multipliedBy(-1).toString();
                result = operation;
            }
        }
        return result;
    }

    private _parseToClause(operation: Operation): ActionResultWithData2<Transaction.Clause, number> {
        let result = new ActionResultWithData2<Transaction.Clause, number>();

        if (operation.account!.sub_account == null) {
            result.Data = this._parseToVETClause(operation);
            result.Data2 = 21000;
            result.Result = true;
        } else {
            var vip180Addr = operation.account!.sub_account!.address;
            var filterToken = this._environment.getVIP180TokenList().filter(config => { return config.address.toLowerCase() == vip180Addr.toLowerCase() });
            if (filterToken.length == 1) {
                var tokenConfig = filterToken[0];
                result.Data = this._parseToVIP180Clause(operation);
                result.Data2 = tokenConfig.metadata.safetransfergas || 2000000;
                result.Result = true;
            }
            else {
                result.ErrorData = RosettaErrorDefine.VIP180ADDRESSNOTINLIST;
                result.Result = false;
                this._environment.logHelper.error(JSON.stringify(this._environment.getVIP180TokenList()));
            }
        }
        return result;
    }

    private _parseToVETClause(operation: Operation): Transaction.Clause {
        let clause: Transaction.Clause = {
            to: null,
            value: "0x0",
            data: "0x"
        }
        clause.to = operation.account!.address;
        clause.value = (new BigNumberEx(operation.amount!.value)).toString();
        return clause;
    }

    private _parseToVIP180Clause(operation: Operation): Transaction.Clause {
        let clause: Transaction.Clause = {
            to: null,
            value: "0x0",
            data: "0x"
        }
        clause.to = operation.account!.sub_account!.address;
        clause.value = 0;
        clause.data = VIP180Helper.encodeTransferCall(operation.account!.address, new BigNumberEx(operation.amount!.value));
        return clause;
    }

    private _signTransaction(transaction: Transaction, signature: Signature): ActionResultWithData<string> {
        let result = new ActionResultWithData<string>();

        var signHash = transaction.signingHash();
        var verfiySignPayloadResult = this._verfiySignPayload(signHash, signature);
        if (verfiySignPayloadResult.Result) {
            transaction.signature = HexStringHelper.ConvertToBuffer(signature.hex_bytes);
            result.Data = transaction.encode().toString('hex');;
            result.Result = true;
        } else {
            result.Result = false;
            result.ErrorData = RosettaErrorDefine.ORIGINSIGNTUREINVALID;
            return result;
        }

        return result;
    }

    private _signVIP191Transaction(transaction: Transaction, signatures: Array<Signature>): ActionResultWithData<string> {
        let result = new ActionResultWithData<string>();
        var originSignature = signatures[0];
        var delegatorSignature = signatures[1];

        var delegateSignHash = transaction.signingHash(originSignature.signing_payload.address);
        var verfiyDelegatorSignPayloadResult = this._verfiySignPayload(delegateSignHash, delegatorSignature);
        if (!verfiyDelegatorSignPayloadResult.Result) {
            result.ErrorData = RosettaErrorDefine.DELEGATORSIGNATUREINVALID;
            result.Result = false;
            return result;
        }

        var originSignHash = transaction.signingHash();
        var verfiyOriginSignPayloadResult = this._verfiySignPayload(originSignHash, originSignature);
        if (!verfiyOriginSignPayloadResult.Result) {
            result.ErrorData = RosettaErrorDefine.ORIGINSIGNTUREINVALID;
            result.Result = false;
            return result;
        }

        transaction.signature = Buffer.concat([HexStringHelper.ConvertToBuffer(originSignature.hex_bytes), HexStringHelper.ConvertToBuffer(delegatorSignature.hex_bytes)]);
        result.Data = transaction.encode().toString('hex');;
        result.Result = true;

        return result;
    }

    private _verfiySignPayload(signHash: Buffer, signatures: Signature): ActionResult {
        let result = new ActionResult();
        result.Result = true;

        if (!signHash.equals(HexStringHelper.ConvertToBuffer(signatures.signing_payload.hex_bytes))) {
            result.Result = false;
            return result;
        }

        try {
            var publickey = secp256k1.recover(signHash, HexStringHelper.ConvertToBuffer(signatures.hex_bytes));
            let puk = Buffer.from(signatures.public_key.hex_bytes,"hex");
            if(puk.length == 33){
                puk = Secp256k1Ex.toUncompress(puk);
            }

            if (!publickey.equals(puk)) {
                result.Result = false;
                return result;
            }

            if (!publicKeyToAddress(publickey).equals(HexStringHelper.ConvertToBuffer(signatures.signing_payload.address))) {
                result.Result = false;
                return result;
            }
        } catch (error) {
            result.Result = false;
            return result;
        }
        return result;
    }
}