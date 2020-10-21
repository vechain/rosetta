import { GlobalEnvironment } from "../../app/globalEnvironment";
import { NetworkType } from "../types/networkType";
import { ActionResultWithData, ActionResultWithData2 } from "../../utils/components/actionResult";
import ThorPeer from "../types/peer";
import { HttpClientHelper } from "../../utils/helper/httpClientHelper";                                                                       
import { BlockDetail, BlockIdentifier } from "../types/block";
import { Transaction, TransactionIdentifier, Operation, OperationIdentifier, OperationType } from "../types/transaction";
import { RosettaErrorDefine } from "../types/rosettaError";
import { AccountIdentifier } from "../types/account";
import { Amount, Currency } from "../types/amount";
import { BigNumberEx } from "../../utils/helper/bigNumberEx";
import { Transaction as ThroTransaction } from "thor-devkit";
import ConnexEx from "../../utils/helper/connexEx";
import { OperationStatus } from "../types/rosetta";

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

        if(connex!.NetWorkType == NetworkType.MainNet && txID.toLocaleLowerCase() == "0x0000000000000000000000000000000000000000000000000000000000000000"){
            result.Data = this._buildMainnetGenesisTransaction();
            result.Result = true; 
            return result;
        } else if (connex!.NetWorkType == NetworkType.TestNet && txID.toLocaleLowerCase() == "0x0000000000000000000000000000000000000000000000000000000000000000"){
            result.Data = this._buildTestnetGenesisTransaction();
            result.Result = true; 
            return result;
        }

        if (connex) {
            const txVisitor = connex.thor.transaction(txID);
            try {
                const txReceipt = await txVisitor.getReceipt();

                if (txReceipt != null && (txReceipt.meta.blockID == revision || txReceipt.meta.blockNumber == revision || revision == undefined)) {
                        var blockIdentifier = new BlockIdentifier();
                        blockIdentifier.hash = txReceipt.meta.blockID;
                        blockIdentifier.index = txReceipt.meta.blockNumber;
                        let rosettaTransaction = this._buildRosettaTransactionReceipt(txReceipt,connex,blockIdentifier);
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
        result.Data = connex.thor.status;
        result.Result = true;
        return result;
    }

    private async _getBlockDetail(connex: ConnexEx, revision?: number | string): Promise<ActionResultWithData2<BlockDetail,Array<{hash:string}>>> {
        let result = new ActionResultWithData2<BlockDetail,Array<{hash:string}>>();

        let other_transactions:Array<{hash:string}>|undefined; 
        other_transactions = new Array<{hash:string}>();

        let apiUrl = connex.baseUrl + "/blocks/" + revision;
        let parames = [{ key: "expanded", value: "true" }];

        if(connex.NetWorkType == NetworkType.MainNet && (revision!.toString() == "0" || revision!.toString().toLocaleLowerCase() == "0x00000000851caf3cfdb6e899cf5958bfb1ac3413d346d43539627e6be7ec1b4a")){
            return this._buildMainnetGenesisBlockDetail();
        } else if (connex.NetWorkType == NetworkType.TestNet && (revision!.toString() == "0" || revision!.toString().toLocaleLowerCase() == "0x000000000b2bce3c70bc649a02749e8687721b09ed2e15997f466536b20bb127")){
            return this._buildTestnetGenesisBlockDetail();
        }

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
                        other_transactions.push({hash:transaction.id});
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

        this._environment.logHelper.error(JSON.stringify(transaction));
        this._environment.logHelper.error(JSON.stringify(rosettaTransaction));

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
                feeOperation.amount.value = (new BigNumberEx(transaction.paid)).dividedBy(-1).toString();
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
                feeOperation.amount.value = (new BigNumberEx(transaction.paid)).dividedBy(-1).toString();
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

    private _buildRosettaTransactionReceipt(receipt: Connex.Thor.Receipt,connex: ConnexEx,blockIdentifier:BlockIdentifier): Transaction {
        let rosettaTransaction = new Transaction();

        rosettaTransaction.transaction_identifier = new TransactionIdentifier();
        rosettaTransaction.transaction_identifier.hash = receipt.meta.blockID;

        rosettaTransaction.operations = new Array<Operation>();

        for (let network_index = 0; network_index < (receipt.outputs as Array<any>).length; network_index++) {
            let operations = this._filterOperation(receipt.outputs[network_index],connex.NetWorkType);
            for(var operation of operations)
            {
                operation.operation_identifier = new OperationIdentifier();
                operation.operation_identifier.network_index = network_index;
                operation.status = this._transactionStatus(connex,blockIdentifier,receipt);
            }

            for (const operation of operations) {
                rosettaTransaction.operations.push(operation);
            }
        }

        if(rosettaTransaction.operations.length > 0)
        {
            if(receipt.gasPayer != receipt.meta.txOrigin){
                let feeOperation = new Operation();
                feeOperation.operation_identifier = new OperationIdentifier();
                feeOperation.operation_identifier.network_index = undefined;

                feeOperation.type = OperationType.FeeDelegation;
                feeOperation.status = this._transactionStatus(connex,blockIdentifier,receipt);

                feeOperation.amount = Amount.CreateVTHO();
                feeOperation.amount.value = (new BigNumberEx(receipt.paid)).dividedBy(-1).toString();
                rosettaTransaction.operations.push(feeOperation);
                
                feeOperation.account = new AccountIdentifier();
                feeOperation.account.address = receipt.gasPayer;
                feeOperation.account.sub_account = new AccountIdentifier();
                feeOperation.account.sub_account.address = this._environment.getVTHOConfig().address;
            } else {
                let feeOperation = new Operation();
                feeOperation.operation_identifier = new OperationIdentifier();
                feeOperation.operation_identifier.network_index = undefined;

                feeOperation.type = OperationType.Fee;
                feeOperation.status = this._transactionStatus(connex,blockIdentifier,receipt);

                feeOperation.amount = Amount.CreateVTHO();
                feeOperation.amount.value = (new BigNumberEx(receipt.paid)).dividedBy(-1).toString();
                rosettaTransaction.operations.push(feeOperation);
                
                feeOperation.account = new AccountIdentifier();
                feeOperation.account.address = receipt.meta.txOrigin;
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

    private _buildMainnetGenesisBlockDetail():ActionResultWithData2<BlockDetail,Array<{hash:string}>>
    {
        let result = new ActionResultWithData2<BlockDetail,Array<{hash:string}>>();

        let genesisBlockDetail = new BlockDetail();
        genesisBlockDetail.block_identifier = new BlockIdentifier();
        genesisBlockDetail.block_identifier.index = 0;
        genesisBlockDetail.block_identifier.hash = "0x00000000851caf3cfdb6e899cf5958bfb1ac3413d346d43539627e6be7ec1b4a";
        genesisBlockDetail.parent_block_identifier = genesisBlockDetail.block_identifier;
        genesisBlockDetail.timestamp = 1530316800;
        genesisBlockDetail.transactions = new Array<Transaction>();
        genesisBlockDetail.transactions.push(this._buildMainnetGenesisTransaction());

        result.Data = genesisBlockDetail;
        result.Data2 = new Array<{hash:string}>();
        result.Result = true;
        return result;
    }

    private _buildMainnetGenesisTransaction():Transaction{
        let genesisBlockTransaction = new Transaction();
        genesisBlockTransaction.transaction_identifier.hash = "0x0000000000000000000000000000000000000000000000000000000000000000";
        
        let operation1 = new Operation();
        operation1.operation_identifier.index = 0;
        operation1.operation_identifier.network_index = 0;
        operation1.type = OperationType.Transfer;
        operation1.status = OperationStatus.Succeeded.status;
        operation1.account = new AccountIdentifier();
        operation1.account.address = "0x137053dfbe6c0a43f915ad2efefefdcc2708e975";
        operation1.amount = Amount.CreateVET();
        operation1.amount.value = "21046908616500000000000000000";

        let operation2 = new Operation();
        operation2.operation_identifier.index = 1;
        operation2.operation_identifier.network_index = 0;
        operation2.type = OperationType.Transfer;
        operation2.status = OperationStatus.Succeeded.status;
        operation2.account = new AccountIdentifier();
        operation2.account.address = "0xaf111431c1284a5e16d2eecd2daed133ce96820e";
        operation2.amount = Amount.CreateVET();
        operation2.amount.value = "21046908616500000000000000000";

        let operation3 = new Operation();
        operation3.operation_identifier.index = 2;
        operation3.operation_identifier.network_index = 0;
        operation3.type = OperationType.Transfer;
        operation3.status = OperationStatus.Succeeded.status;
        operation3.account = new AccountIdentifier();
        operation3.account.address = "0x997522a4274336f4b86af4a6ed9e45aedcc6d360";
        operation3.amount = Amount.CreateVET();
        operation3.amount.value = "21046908616500000000000000000";

        let operation4 = new Operation();
        operation4.operation_identifier.index = 3;
        operation4.operation_identifier.network_index = 0;
        operation4.type = OperationType.Transfer;
        operation4.status = OperationStatus.Succeeded.status;
        operation4.account = new AccountIdentifier();
        operation4.account.address = "0x0bd7b06debd1522e75e4b91ff598f107fd826c8a";
        operation4.amount = Amount.CreateVET();
        operation4.amount.value = "21046908616500000000000000000";

        genesisBlockTransaction.operations.push(operation1,operation2,operation3,operation4);

        return genesisBlockTransaction;
    }

    private _buildTestnetGenesisBlockDetail():ActionResultWithData2<BlockDetail,Array<{hash:string}>>
    {
        let result = new ActionResultWithData2<BlockDetail,Array<{hash:string}>>();

        let genesisBlockDetail = new BlockDetail();
        genesisBlockDetail.block_identifier = new BlockIdentifier();
        genesisBlockDetail.block_identifier.index = 0;
        genesisBlockDetail.block_identifier.hash = "0x000000000b2bce3c70bc649a02749e8687721b09ed2e15997f466536b20bb127";
        genesisBlockDetail.parent_block_identifier = genesisBlockDetail.block_identifier;
        genesisBlockDetail.timestamp = 1530014400;
        genesisBlockDetail.transactions = new Array<Transaction>();
        genesisBlockDetail.transactions.push(this._buildTestnetGenesisTransaction());

        result.Data = genesisBlockDetail;
        result.Data2 = new Array<{hash:string}>();
        result.Result = true;
        return result;
    }

    private _buildTestnetGenesisTransaction():Transaction{
        let genesisBlockTransaction = new Transaction();
        genesisBlockTransaction.transaction_identifier.hash = "0x0000000000000000000000000000000000000000000000000000000000000000";
        
        let operation1 = new Operation();
        operation1.operation_identifier.index = 0;
        operation1.operation_identifier.network_index = 0;
        operation1.type = OperationType.Transfer;
        operation1.status = OperationStatus.Succeeded.status;
        operation1.account = new AccountIdentifier();
        operation1.account.address = "0xe59D475Abe695c7f67a8a2321f33A856B0B4c71d";
        operation1.amount = Amount.CreateVET();
        operation1.amount.value = "50000000000000000000000000000";

        let operation2 = new Operation();
        operation2.operation_identifier.index = 1;
        operation2.operation_identifier.network_index = 0;
        operation2.type = OperationType.Transfer;
        operation2.status = OperationStatus.Succeeded.status;
        operation2.account = new AccountIdentifier();
        operation2.account.address = "0xb4094c25f86d628fdD571Afc4077f0d0196afB48";
        operation2.amount = Amount.CreateVET();
        operation2.amount.value = "25000000000000000000000000";

        genesisBlockTransaction.operations.push(operation1,operation2);

        return genesisBlockTransaction;
    }
}