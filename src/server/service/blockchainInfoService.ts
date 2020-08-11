import { GlobalEnvironment } from "../../app/globalEnvironment";
import { NetworkType } from "../datameta/networkType";
import { ActionResultWithData, ActionResult, ActionResultWithData2 } from "../../utils/components/actionResult";
import ThorPeer from "../datameta/peer";
import { HttpClientHelper } from "../../utils/helper/httpClientHelper";                                                                       
import { BlockDetail, BlockIdentifier } from "../datameta/block";
import { Transaction, TransactionIdentifier, Operation, OperationIdentifier, OperationType } from "../datameta/transaction";
import { RosettaErrorDefine } from "../datameta/rosettaError";
import { AccountIdentifier } from "../datameta/account";
import { Amount, Currency } from "../datameta/amount";
import { BigNumberEx } from "../../utils/helper/bigNumberEx";
import { Transaction as ThroTransaction } from "thor-devkit";
import ConnexEx from "../../utils/helper/connexEx";
import { OperationStatus } from "../datameta/rosetta";
import { string } from "joi";


export class BlockChainInfoService {

    private _environment: GlobalEnvironment;

    constructor(environment: GlobalEnvironment) {
        this._environment = environment;
    }

    public getGenesisBlock(type: NetworkType): ActionResultWithData<Connex.Thor.Block> {
        let result = new ActionResultWithData<Connex.Thor.Block>();
        let connex = this._environment.getConnex(type);

        if (connex) {
            result = this._getGenesisBlock(connex);
        } else {
            result.Result = false;
            result.ErrorData = RosettaErrorDefine.NODECONNETCONNECTION;
        }
        return result;
    }

    public async getPeers(type: NetworkType): Promise<ActionResultWithData<Array<ThorPeer>>> {
        let result = new ActionResultWithData<Array<ThorPeer>>();
        let connex = this._environment.getConnex(type);

        if (connex) {
            result = await this._getPeers(connex);
        } else {
            result.Result = false;
            result.ErrorData = RosettaErrorDefine.NODECONNETCONNECTION;
        }
        return result;
    }

    public async getBestBlockStatus(type: NetworkType): Promise<ActionResultWithData<Connex.Thor.Status>> {
        let result = new ActionResultWithData<Connex.Thor.Status>();
        let connex = this._environment.getConnex(type);

        if (connex) {
            result = await this._getBestBlockStatus(connex);
        } else {
            result.Result = false;
            result.ErrorData = RosettaErrorDefine.NODECONNETCONNECTION;
        }

        return result;
    }

    public async getBlockDetail(type: NetworkType, revision: number | string): Promise<ActionResultWithData2<BlockDetail,Array<{hash:string}>>> {
        let result = new ActionResultWithData2<BlockDetail,Array<{hash:string}>>();
        let connex = this._environment.getConnex(type);

        if (connex) {
            result = await this._getBlockDetail(connex, revision);
        } else {
            result.Result = false;
            result.ErrorData = RosettaErrorDefine.NODECONNETCONNECTION;
        }

        return result;
    }

    public async getTransactionByBlock(type: NetworkType, txID: string, revision: number | string): Promise<ActionResultWithData<Transaction>> {
        let result = new ActionResultWithData<Transaction>();
        let connex = this._environment.getConnex(type);

        if (connex) {
            const txVisitor = connex.thor.transaction(txID);
            try {
                const txReceipt = await txVisitor.getReceipt();
                if (txReceipt != null && (txReceipt.meta.blockID == revision || txReceipt.meta.blockNumber == revision || revision == undefined)) {
                        var blockIdentifier = new BlockIdentifier();
                        blockIdentifier.hash = txReceipt.meta.blockID;
                        blockIdentifier.index = txReceipt.meta.blockNumber;
                        let rosettaTransaction = this._buildRosettaTransaction(txReceipt,connex,blockIdentifier);
                        result.Data = rosettaTransaction;
                        result.Result = true;
                        return result;
                }
                else
                {
                    result.Result = false;
                    result.ErrorData = RosettaErrorDefine.TRANSACTIONNOTEXISTS;
                }
            } catch{
                result.Result = false;
                result.ErrorData = RosettaErrorDefine.NODEAPIERROR;
            }
        } else {
            result.Result = false;
            result.ErrorData = RosettaErrorDefine.NODECONNETCONNECTION;
        }

        return result;
    }

    public async sendSignedTransaction(type: NetworkType, txRaw: string): Promise<ActionResultWithData<string>> {
        let result = new ActionResultWithData<string>();
        let connex = this._environment.getConnex(type);

        if (connex) {
            result = await this._sendSignedTx(connex, txRaw);
        } else {
            result.Result = false;
            result.ErrorData = RosettaErrorDefine.NODECONNETCONNECTION;
        }

        return result;
    }

    private _getGenesisBlock(connex: Connex): ActionResultWithData<Connex.Thor.Block> {
        let result = new ActionResultWithData<Connex.Thor.Block>();
        result.Data = connex.thor.genesis;
        result.Result = true;
        return result;
    }

    private async _getBestBlockStatus(connex: Connex): Promise<ActionResultWithData<Connex.Thor.Status>> {
        let result = new ActionResultWithData<Connex.Thor.Status>();

        if (connex.thor.status.progress == 1) {
            result.Data = connex.thor.status;
            result.Result = true;
        }
        else {
            result.Result = false;
            result.ErrorData = RosettaErrorDefine.NODESYNCNOTCOMPLETE;
        }

        return result;
    }

    private async _getPeers(connex: ConnexEx): Promise<ActionResultWithData<Array<ThorPeer>>> {
        let result = new ActionResultWithData<Array<ThorPeer>>();
        result.Data = new Array<ThorPeer>();

        let apiUrl = connex.baseUrl + "/node/network/peers";

        let client = new HttpClientHelper(apiUrl);
        let httpResult = await client.doRequest("GET", undefined, undefined, undefined);
        if (httpResult.Result && httpResult.Data && httpResult.Data.constructor.name == "Array") {
            for (let item of httpResult.Data) {
                result.Data.push((item as ThorPeer));
            }
            result.Result = true;
        }
        else {
            result.Result = false;
            result.ErrorData = RosettaErrorDefine.NODEAPIERROR;
        }
        return result;
    }

    private async _getBlockDetail(connex: ConnexEx, revision?: number | string): Promise<ActionResultWithData2<BlockDetail,Array<{hash:string}>>> {
        let result = new ActionResultWithData2<BlockDetail,Array<{hash:string}>>();

        let other_transactions:Array<{hash:string}>|undefined; 
        other_transactions = new Array<{hash:string}>();

        let apiUrl = connex.baseUrl + "/blocks/" + revision;
        let parames = [{ key: "expanded", value: "true" }];

        let client = new HttpClientHelper(apiUrl);
        let httpResult = await client.doRequest("GET", parames, undefined, undefined);
        if (httpResult.Result) {
            if (httpResult.Data != null) {
                let block = new BlockDetail();

                block.block_identifier = new BlockIdentifier();
                block.block_identifier.index = httpResult.Data.number;
                block.block_identifier.hash = httpResult.Data.id;

                block.parent_block_identifier = new BlockIdentifier();
                block.parent_block_identifier.index = httpResult.Data.number > 0 ? httpResult.Data.number - 1 : 0;
                block.parent_block_identifier.hash = httpResult.Data.number > 0 ? httpResult.Data.parentID : httpResult.Data.id;

                block.timestamp = httpResult.Data.timestamp * 1000;

                block.transactions = new Array<Transaction>();

                for (const transaction of httpResult.Data.transactions) {
                    let rosettaTransaction = this._buildRosettaTransaction(transaction,connex,block.block_identifier);
                    if (rosettaTransaction.operations.length > 0) {
                        block.transactions.push(rosettaTransaction);
                    }else{
                        //other_transactions.push({hash:transaction.id});
                    }
                }

                result.Data = block;
                result.Data2 = other_transactions;
                result.Result = true;
            } else {
                result.Result = false;
                result.ErrorData = RosettaErrorDefine.BLOCKNOTEXISTS;
            }
        } else {
            result.Result = false;
            result.ErrorData = RosettaErrorDefine.NODEAPIERROR;
        }
        return result;
    }

    private _buildRosettaTransaction(transaction: any,connex: ConnexEx,blockIdentifier:BlockIdentifier): Transaction {
        let rosettaTransaction = new Transaction();

        rosettaTransaction.transaction_identifier = new TransactionIdentifier();
        rosettaTransaction.transaction_identifier.hash = transaction.id;

        rosettaTransaction.operations = new Array<Operation>();

        for (let network_index = 0; network_index < (transaction.outputs as Array<any>).length; network_index++) {
            let operations = this._filterOperation(transaction.outputs[network_index],connex.NetWorkType);
            for(var operation of operations)
            {
                operation.operation_identifier = new OperationIdentifier();
                operation.operation_identifier.network_index = network_index;
                operation.status = this._transactionStatus(connex,blockIdentifier,transaction);
            }

            for (const operation of operations) {
                rosettaTransaction.operations.push(operation);
            }
        }

        if(rosettaTransaction.operations.length > 0)
        {
            if(transaction.delegator != null){
                let feeOperation = new Operation();
                feeOperation.operation_identifier = new OperationIdentifier();
                feeOperation.operation_identifier.network_index = undefined;

                feeOperation.type = OperationType.FeeDelegation;
                feeOperation.status = this._transactionStatus(connex,blockIdentifier,transaction);

                feeOperation.amount = Amount.CreateVTHO();
                feeOperation.amount.value = (new BigNumberEx(transaction.gasUsed)).dividedBy(Math.pow(10,3)).multipliedBy(Math.pow(10,feeOperation.amount.currency.decimals)).dividedBy(-1).toString();
                rosettaTransaction.operations.push(feeOperation);
                
                feeOperation.account = new AccountIdentifier();
                feeOperation.account.address = transaction.delegator;
                feeOperation.account.sub_account = new AccountIdentifier();
                feeOperation.account.sub_account.address = this._environment.getVTHOConfig().address;
            } else {
                let feeOperation = new Operation();
                feeOperation.operation_identifier = new OperationIdentifier();
                feeOperation.operation_identifier.network_index = undefined;

                feeOperation.type = OperationType.Fee;
                feeOperation.status = this._transactionStatus(connex,blockIdentifier,transaction);

                feeOperation.amount = Amount.CreateVTHO();
                feeOperation.amount.value = (new BigNumberEx(transaction.gasUsed)).dividedBy(Math.pow(10,3)).multipliedBy(Math.pow(10,feeOperation.amount.currency.decimals)).dividedBy(-1).toString();
                rosettaTransaction.operations.push(feeOperation);
                
                feeOperation.account = new AccountIdentifier();
                feeOperation.account.address = transaction.origin;
                feeOperation.account.sub_account = new AccountIdentifier();
                feeOperation.account.sub_account.address = this._environment.getVTHOConfig().address;
            }
        }

        for(let index = 0; rosettaTransaction.operations.length > index; index++)
        {
            rosettaTransaction.operations[index].operation_identifier.index = index;
        }

        return rosettaTransaction;
    }

    private _filterOperation(output: any,networkType:NetworkType): Array<Operation> {
        let result = new Array<Operation>();

        let VETTransfers = output.transfers as Array<any>;

        let vip180TokenEvents = (output.events as Array<any>).filter(event => {
            return this._environment.getVIP180TokenList().find(tokenInfo => {return tokenInfo.address.toLowerCase() === event.address.toLocaleLowerCase()}) != undefined
            && event.topics[0].toLocaleLowerCase() === "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
        });

        for(const VETTransfer of VETTransfers)
        {
            let senderOperation = new Operation();

            senderOperation.type = OperationType.Transfer;

            senderOperation.account = new AccountIdentifier();
            senderOperation.account.address = VETTransfer.sender;

            senderOperation.amount = Amount.CreateVET();
            senderOperation.amount.value = (new BigNumberEx(VETTransfer.amount)).multipliedBy(-1).toString();

            let receiveOperation = new Operation();

            receiveOperation.type = OperationType.Transfer;

            receiveOperation.account = new AccountIdentifier();
            receiveOperation.account.address = VETTransfer.recipient;

            receiveOperation.amount = Amount.CreateVET();
            receiveOperation.amount.value = (new BigNumberEx(VETTransfer.amount)).toString();


            result.push(senderOperation);
            result.push(receiveOperation);
        }

        for(const event of vip180TokenEvents){
            let vip180Config = this._environment.getVIP180TokenList().find(tokenInfo => tokenInfo.address.toLowerCase() == event.address);
            let tokenCurrency = new Currency(vip180Config!.symbol,vip180Config!.decimals,undefined);

            let senderOperation = new Operation();

            senderOperation.type = OperationType.Transfer;

            senderOperation.account = new AccountIdentifier();
            senderOperation.account.address = this._topicToAddress(event.topics[1]);
            senderOperation.account.sub_account = new AccountIdentifier();
            senderOperation.account.sub_account.address = vip180Config!.address;

            senderOperation.amount = new Amount();
            senderOperation.amount.currency = tokenCurrency;
            senderOperation.amount.value = (new BigNumberEx(event.data)).multipliedBy(-1).toString();

            let receiveOperation = new Operation();

            receiveOperation.type = OperationType.Transfer;

            receiveOperation.account = new AccountIdentifier();
            receiveOperation.account.address = this._topicToAddress(event.topics[2]);
            receiveOperation.account.sub_account = new AccountIdentifier();
            receiveOperation.account.sub_account.address = vip180Config!.address;

            receiveOperation.amount = Amount.CreateVTHO();
            receiveOperation.amount.currency = tokenCurrency;
            receiveOperation.amount.value = (new BigNumberEx(event.data)).toString();

            result.push(senderOperation);
            result.push(receiveOperation);
        }

        return result;
    }

    private _topicToAddress(topic: string): string {
        return "0x" + topic.substring(topic.length - 40);
    }

    private async _sendSignedTx(connex: ConnexEx, txRaw: string): Promise<ActionResultWithData<string>> {
        let result = new ActionResultWithData<string>();

        let decodeResult = this._decodeTransaction(txRaw);
        if (decodeResult.Result && decodeResult.Data) {
            if (decodeResult.Data.body.chainTag === connex.chainTag) {
                let apiUrl = connex.baseUrl + "/transactions";

                let client = new HttpClientHelper(apiUrl);
                let requestBody = { raw: txRaw };
                let httpResult = await client.doRequest("POST", undefined, undefined, requestBody);
                if (httpResult.Result && httpResult.Data.id) {
                    result.Data = httpResult.Data.id;
                    result.Result = true;
                } else {
                    result.Result = false;
                    result.ErrorData = RosettaErrorDefine.NODEAPIERROR;
                }
            } else {
                result.Result = false;
                result.ErrorData = RosettaErrorDefine.SIGNEDTRANSACTIONINVALID;
            }
        } else {
            result.copyBase(decodeResult);
        }

        return result;
    }

    private _decodeTransaction(txRaw: string): ActionResultWithData<ThroTransaction> {
        let result = new ActionResultWithData<ThroTransaction>();

        try {
            let transaction = ThroTransaction.decode(new Buffer(txRaw.toLowerCase().replace("0x", ""), "hex"), false);
            result.Data = transaction;
            result.Result = true;
        } catch (error) {
            result.Result = false;
            result.ErrorData = RosettaErrorDefine.SIGNEDTRANSACTIONINVALID;
        }

        return result;
    }

    private _transactionStatus(connex: ConnexEx,blockIdentifier:BlockIdentifier,transaction:any):string
    {
        if(connex.thor.status.head.number - blockIdentifier.index >= (this._environment.config.confirm_num as number))
        {
            return transaction.reverted == false ? OperationStatus.Succeeded.status : OperationStatus.Reverted.status;
        }
        else
        {
            return OperationStatus.Pendding.status;
        }
    }
}