import { GlobalEnvironment, iConfig } from "../../app/globalEnvironment";
import { NetworkType } from "../datameta/networkType";
import { ActionResultWithData, ActionResult } from "../../utils/components/actionResult";
import ThorPeer from "../datameta/peer";
import { HttpClientHelper } from "../../utils/helper/httpClientHelper";
import { BlockDetail, BlockIdentifier } from "../datameta/block";
import { Transaction, TransactionIdentifier, Operation, OperationIdentifier, OperationType } from "../datameta/transaction";
import { RosettaErrorDefine } from "../datameta/rosettaError";
import { AccountIdentifier } from "../datameta/account";
import { Amount } from "../datameta/amount";
import { BigNumberEx } from "../../utils/helper/bigNumberEx";
import { Transaction as ThroTransaction} from "thor-devkit";
import ConnexEx from "../../utils/helper/connexEx";
import { OperationStatus } from "../datameta/rosetta";


export class BlockChainInfoService{

    private _environment:GlobalEnvironment;

    constructor(environment:GlobalEnvironment){
        this._environment = environment;
    }

    public getGenesisBlock(type:NetworkType):ActionResultWithData<Connex.Thor.Block>{
        let result = new ActionResultWithData<Connex.Thor.Block>();
        let connex = this._environment.getConnex(type);

        if(connex){
            result = this._getGenesisBlock(connex);
        }else{
            result.Result = false;
            result.ErrorData = RosettaErrorDefine.NODECONNETCONNECTION;
        }
        return result;
    }

    public async getPeers(type:NetworkType):Promise<ActionResultWithData<Array<ThorPeer>>>{
        let result = new ActionResultWithData<Array<ThorPeer>>();
        let connex = this._environment.getConnex(type);

        if(connex){
            result = await  this._getPeers(connex);
        }else{
            result.Result = false;
            result.ErrorData = RosettaErrorDefine.NODECONNETCONNECTION;
        }
        return result;
    }

    public async getBestBlockStatus(type:NetworkType):Promise<ActionResultWithData<Connex.Thor.Status>>{
        let result = new ActionResultWithData<Connex.Thor.Status>();
        let connex = this._environment.getConnex(type);

        if(connex){
            result = await this._getBestBlockStatus(connex);
        }else{
            result.Result = false;
            result.ErrorData = RosettaErrorDefine.NODECONNETCONNECTION;
        }

        return result;
    }

    public async getBlockDetail(type:NetworkType,revision:number | string):Promise<ActionResultWithData<BlockDetail>>{
        let result = new ActionResultWithData<BlockDetail>();
        let connex = this._environment.getConnex(type);

        if(connex){
            result = await this._getBlockDetail(connex,revision);
        }else{
            result.Result = false;
            result.ErrorData = RosettaErrorDefine.NODECONNETCONNECTION;
        }

        return result;
    }

    public async getTransactionByBlock(type:NetworkType,txID:string,revision:number | string):Promise<ActionResultWithData<Transaction>>{
        let result = new ActionResultWithData<Transaction>();
        let connex = this._environment.getConnex(type);

        if(connex){
            result = await this._getTransactionByBlock(connex,txID,revision);
        }else{
            result.Result = false;
            result.ErrorData = RosettaErrorDefine.NODECONNETCONNECTION;
        }

        return result;
    }

    public async getTransactionInMempool(type:NetworkType,txID:string):Promise<ActionResultWithData<Transaction>>{
        let result = new ActionResultWithData<Transaction>();

        return result;
    }

    public async sendSignedTransaction(type:NetworkType,txRaw:string):Promise<ActionResultWithData<string>>{
        let result = new ActionResultWithData<string>();
        let connex = this._environment.getConnex(type);

        if(connex){
            result = await this._sendSignedTx(connex,txRaw);
        }else{
            result.Result = false;
            result.ErrorData = RosettaErrorDefine.NODECONNETCONNECTION;
        }

        return result;
    }

    private _getGenesisBlock(connex:Connex):ActionResultWithData<Connex.Thor.Block>{
        let result = new ActionResultWithData<Connex.Thor.Block>();
        result.Data = connex.thor.genesis;
        result.Result = true;
        return result;
    }

    private async _getBestBlockStatus(connex:Connex):Promise<ActionResultWithData<Connex.Thor.Status>>{
        let result = new ActionResultWithData<Connex.Thor.Status>();

        if(connex.thor.status.progress == 1){
            result.Data = connex.thor.status;
            result.Result = true;
        }
        else{
            result.Result = false;
            result.ErrorData = RosettaErrorDefine.NODESYNCNOTCOMPLETE;
        }
        
        return result;
    }

    private async _getPeers(connex:ConnexEx):Promise<ActionResultWithData<Array<ThorPeer>>>{
        let result = new ActionResultWithData<Array<ThorPeer>>();
        result.Data = new Array<ThorPeer>();

        let apiUrl = connex.baseUrl + "/node/network/peers";

        let client = new HttpClientHelper(apiUrl);
        let httpResult = await client.doRequest("GET",undefined,undefined,undefined);
        if(httpResult.Result && httpResult.Data && httpResult.Data.constructor.name == "Array"){
            for(let item of httpResult.Data){
                result.Data.push((item as ThorPeer));
            }
            result.Result = true;
        }
        else{
            result.Result = false;
            result.ErrorData = RosettaErrorDefine.NODEAPIERROR;
        }
        return result;
    }

    private async _getBlockDetail(connex:ConnexEx,revision?:number | string):Promise<ActionResultWithData<BlockDetail>>{
        let result = new ActionResultWithData<BlockDetail>();

        let apiUrl = connex.baseUrl + "/blocks/" + revision;
        let parames = [{key:"expanded",value:"true"}];

        let client = new HttpClientHelper(apiUrl);
        let httpResult = await client.doRequest("GET",parames,undefined,undefined);
        if(httpResult.Result){
            if(httpResult.Data != null){
                let block = new BlockDetail();

            block.block_identifier = new BlockIdentifier();
            block.block_identifier.index = httpResult.Data.number;
            block.block_identifier.hash = httpResult.Data.id;

            block.parent_block_identifier = new BlockIdentifier();
            block.parent_block_identifier.index = httpResult.Data.number > 0 ? httpResult.Data.number - 1 : 0;
            block.parent_block_identifier.hash = httpResult.Data.number >0 ? httpResult.Data.parentID : httpResult.Data.id;

            block.timestamp = httpResult.Data.timestamp;

            block.transactions = new Array<Transaction>();

            for (const transaction of httpResult.Data.transactions) {
                let rosettaTransaction = this._buildRosettaTransaction(transaction);
                if(rosettaTransaction.operations.length > 0){
                    block.transactions.push(rosettaTransaction);
                }
            }

            result.Data = block;
            result.Result = true;
            }else{
                result.Result = false;
                result.ErrorData = RosettaErrorDefine.BLOCKNOTEXISTS;
            }
        }else{
            result.Result = false;
            result.ErrorData = RosettaErrorDefine.NODEAPIERROR;
        }
        return result;
    }

    private async _getTransactionByBlock(connex:Connex,txID:string,revision:number | string):Promise<ActionResultWithData<Transaction>>{
        let result = new ActionResultWithData<Transaction>();

        const txVisitor = connex.thor.transaction(txID);
        try {
            const txReceipt = await txVisitor.getReceipt();
            if(txReceipt != null && (txReceipt.meta.blockID == revision || txReceipt.meta.blockNumber == revision || revision == undefined)){
                let rosettaTransaction = new Transaction();

                rosettaTransaction.transaction_identifier = new TransactionIdentifier();
                rosettaTransaction.transaction_identifier.hash = txID;
                rosettaTransaction.operations = new Array<Operation>();

                let index = 0;
                for(let network_index = 0; network_index < (txReceipt.outputs as Array<any>).length; network_index++ ){
                    let operations = this._filterOperation(network_index,txReceipt.outputs[network_index],txReceipt);
                    for(const operation of operations){
                        operation.operation_identifier.index = index;
                        index ++;
                        rosettaTransaction.operations.push(operation);
                    }
                }
                result.Data = rosettaTransaction;
                result.Result = true;
            }else{
                result.Result = false;
                result.ErrorData = RosettaErrorDefine.TRANSACTIONNOTEXISTS;
            }
        } catch (error) {
            result.Result = false;
            result.ErrorData = RosettaErrorDefine.NODEAPIERROR;
        }

        return result;
    }

    private _buildRosettaTransaction(transaction:any):Transaction{
        let rosettaTransaction = new Transaction();

        rosettaTransaction.transaction_identifier = new TransactionIdentifier();
        rosettaTransaction.transaction_identifier.hash = transaction.id;

        rosettaTransaction.operations = new Array<Operation>();

        let index = 0;
        for(let network_index = 0; network_index < (transaction.outputs as Array<any>).length; network_index++ ){
            let operations = this._filterOperation(network_index,transaction.outputs[network_index],transaction);
            for(const operation of operations){
                operation.operation_identifier.index = index;
                index ++;
                rosettaTransaction.operations.push(operation);
            }
        }

        return rosettaTransaction;
    }

    private _filterOperation(network_index:number,output:any,transaction:any):Array<Operation>{
        let result = new Array<Operation>();

        let VETTransfers = output.transfers as Array<any>;
        let VTHOTransfers = (output.events as Array<any>).filter(item => {
           return item.address === "0x0000000000000000000000000000456e65726779" && item.topics[0] === "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
        });

        if(VETTransfers.length != 0 || VTHOTransfers.length != 0){
            for(const VETTransfer of VETTransfers){
                let senderOperation = new Operation();
                senderOperation.operation_identifier = new OperationIdentifier();
                senderOperation.operation_identifier.network_index = network_index;

                senderOperation.type = OperationType.Send;
                senderOperation.status = transaction.reverted == false ? OperationStatus.Succeeded.status : OperationStatus.Reverted.status;
                
                senderOperation.account = new AccountIdentifier();
                senderOperation.account.address = VETTransfer.sender;

                senderOperation.amount = Amount.CreateVET();
                senderOperation.amount.value = (new BigNumberEx(VETTransfer.amount)).toString();

                let receiveOperation = new Operation();
                receiveOperation.operation_identifier = new OperationIdentifier();
                receiveOperation.operation_identifier.network_index = network_index;

                receiveOperation.type = OperationType.Receive;
                receiveOperation.status = transaction.reverted == false ? OperationStatus.Succeeded.status : OperationStatus.Reverted.status;

                receiveOperation.account = new AccountIdentifier();
                receiveOperation.account.address = VETTransfer.recipient;

                receiveOperation.amount = Amount.CreateVET();
                receiveOperation.amount.value = (new BigNumberEx(VETTransfer.amount)).toString();

                result.push(senderOperation);
                result.push(receiveOperation);
            }

            for(const VTHOTransfer of VTHOTransfers){
                let senderOperation = new Operation();
                senderOperation.operation_identifier = new OperationIdentifier();
                senderOperation.operation_identifier.network_index = network_index;

                senderOperation.type = OperationType.Send;
                senderOperation.status = transaction.reverted == false ? OperationStatus.Succeeded.status : OperationStatus.Reverted.status;
                
                senderOperation.account = new AccountIdentifier();
                senderOperation.account.address = this._topicToAddress(VTHOTransfer.topics[1]);
                senderOperation.account.sub_account = new AccountIdentifier();
                senderOperation.account.sub_account.address = "0x0000000000000000000000000000456e65726779";

                senderOperation.amount = Amount.CreateVTHO();
                senderOperation.amount.value = (new BigNumberEx(VTHOTransfer.data)).toString();

                let receiveOperation = new Operation();
                receiveOperation.operation_identifier = new OperationIdentifier();
                receiveOperation.operation_identifier.network_index = network_index;

                receiveOperation.type = OperationType.Receive;
                receiveOperation.status = transaction.reverted == false ? OperationStatus.Succeeded.status : OperationStatus.Reverted.status;

                receiveOperation.account = new AccountIdentifier();
                receiveOperation.account.address = this._topicToAddress(VTHOTransfer.topics[2]);
                senderOperation.account.sub_account = new AccountIdentifier();
                senderOperation.account.sub_account.address = "0x0000000000000000000000000000456e65726779";

                receiveOperation.amount = Amount.CreateVTHO();
                receiveOperation.amount.value = (new BigNumberEx(VTHOTransfer.data)).toString();

                result.push(senderOperation);
                result.push(receiveOperation);
            }
        }

        return result;
    }

    private _topicToAddress(topic:string):string{
        return "0x" + topic.substring(topic.length-40);
    }

    private async _sendSignedTx(connex:ConnexEx,txRaw:string):Promise<ActionResultWithData<string>>{
        let result = new ActionResultWithData<string>();

        let decodeResult = this._decodeTransaction(txRaw);
        if(decodeResult.Result && decodeResult.Data){
            if(decodeResult.Data.body.chainTag === connex.chainTag){
                let apiUrl = connex.baseUrl + "/transactions";

                let client = new HttpClientHelper(apiUrl);
                let requestBody = {raw:txRaw};
                let httpResult = await client.doRequest("POST",undefined,undefined,requestBody);
                if(httpResult.Result && httpResult.Data.id){
                    result.Data = httpResult.Data.id;
                    result.Result = true;
                }else{
                    result.Result = false;
                    result.ErrorData = RosettaErrorDefine.NODEAPIERROR;
                }
            }else{
                result.Result = false;
                result.ErrorData = RosettaErrorDefine.SIGNEDTRANSACTIONINVALID;
            }
        }else{
            result.copyBase(decodeResult);
        }

        return result;
    }

    private _decodeTransaction(txRaw:string):ActionResultWithData<ThroTransaction>{
        let result = new ActionResultWithData<ThroTransaction>();

        try {
            let transaction = ThroTransaction.decode(new Buffer(txRaw),true);
            result.Data = transaction;
            result.Result = true;
        } catch (error) {
            result.Result = false;
            result.ErrorData = RosettaErrorDefine.SIGNEDTRANSACTIONINVALID;
        }

        return result;
    }
}