import { VETCurrency, VTHOCurrency } from "..";
import { Transaction } from "../common/types/transaction";
import ConnexPro from "../utils/connexPro";
import { VIP180Token } from "../utils/vip180Token";
import { Currency } from "./types/currency";
import { Operation, OperationStatus, OperationType } from "./types/operation";

export class TransactionConverter {

    public constructor(env:any){
        this.env = env;
        this.connex = this.env.connex;
        this.tokenList = this.env.config.tokenlist;
    }

    public async parseRosettaTransaction(txid:string):Promise<Transaction>{
        const result:Transaction = {transaction_identifier:{hash:''},operations:[]};
        const txRece = (await this.connex.thor.transaction(txid).getReceipt());
        if(txRece != undefined){
            result.transaction_identifier = {hash:txid};
            for(let index = 0; index < txRece.outputs.length; index++) {
                const opers = this.parseRosettaOperations(index,txRece);
                result.operations = result.operations.concat(opers);
            }
            if(txRece.gasPayer.toLowerCase() != txRece.meta.txOrigin.toLowerCase()){
                result.operations.push(this.feeDelegationOperation(txRece));
            } else {
                result.operations.push(this.feeOperation(txRece));
            }
            for(let index = 0; index < result.operations.length; index++ ){
                result.operations[index].operation_identifier.index = index;
                result.operations[index].status = txRece.reverted ? OperationStatus.Reverted : OperationStatus.Succeeded;
            }
        }
        return result;
    }

    private parseRosettaOperations(clauseIndex:number,rece:Connex.Thor.Transaction.Receipt):Array<Operation> {
        const result = new Array<Operation>();
        if(rece.outputs.length > 0 && rece.outputs[clauseIndex].transfers.length > 0) {
            for(const trans of rece.outputs[clauseIndex].transfers){
                const sendOper:Operation = {
                    operation_identifier:{
                        index:0,
                        network_index:clauseIndex
                    },
                    type:OperationType.Transfer,
                    status:OperationStatus.None,
                    account:{
                        address:trans.sender
                    },
                    amount:{
                        value:(BigInt(trans.amount) * BigInt(-1)).toString(10),
                        currency:VETCurrency
                    }
                }
                const recpOper:Operation = {
                    operation_identifier:{
                        index:0,
                        network_index:clauseIndex
                    },
                    type:OperationType.Transfer,
                    status:OperationStatus.None,
                    account:{
                        address:trans.recipient
                    },
                    amount:{
                        value:(BigInt(trans.amount)).toString(10),
                        currency:VETCurrency
                    }
                }
                result.push(sendOper,recpOper);
            }
        }

        if(rece.outputs.length > 0 && rece.outputs[clauseIndex].events.length > 0) {
           for(const ev of rece.outputs[clauseIndex].events){
                const targetToken = this.tokenList.find( token => { return token.metadata.contractAddress.toLowerCase() == ev.address.toLowerCase()});
                if(targetToken != undefined){
                    const transEvents = VIP180Token.filterEvents([ev],targetToken.metadata.contractAddress,'Transfer');
                    if(transEvents.length == 1){
                        const transEvet = transEvents[0];
                        const sendOper:Operation = {
                            operation_identifier:{
                                index:0,
                                network_index:clauseIndex
                            },
                            type:OperationType.Transfer,
                            status:OperationStatus.None,
                            account:{
                                address:'0x' + transEvet.topics[1].substring(26),
                            },
                            amount:{
                                value:(BigInt(transEvet.data) * BigInt(-1)).toString(10),
                                currency:{
                                    symbol:targetToken.symbol,
                                    decimals:targetToken.decimals,
                                    metadata:targetToken.metadata
                                }
                            }
                        }
                        const recpOper:Operation = {
                            operation_identifier:{
                                index:0,
                                network_index:clauseIndex
                            },
                            type:OperationType.Transfer,
                            status:OperationStatus.None,
                            account:{
                                address:'0x' + transEvet.topics[2].substring(26),
                            },
                            amount:{
                                value:BigInt(transEvet.data).toString(10),
                                currency:{
                                    symbol:targetToken.symbol,
                                    decimals:targetToken.decimals,
                                    metadata:targetToken.metadata
                                }
                            }
                        }
                        result.push(sendOper,recpOper);
                    }
                }
           }
        }

        return result;
    }

    private feeDelegationOperation(rece:Connex.Thor.Transaction.Receipt):Operation {
        return {
            operation_identifier:{
                index:0,
                network_index:rece.outputs.length
            },
            type:OperationType.FeeDelegation,
            status:OperationStatus.None,
            account:{
                address:rece.gasPayer
            },
            amount:{
                value:(BigInt(rece.paid) * BigInt(-1)).toString(10),
                currency:VTHOCurrency
            }
        }
    }

    private feeOperation(rece:Connex.Thor.Transaction.Receipt):Operation {
        return {
            operation_identifier:{
                index:0,
                network_index:rece.outputs.length
            },
            type:OperationType.Fee,
            status:OperationStatus.None,
            account:{
                address:rece.gasPayer
            },
            amount:{
                value:(BigInt(rece.paid) * BigInt(-1)).toString(10),
                currency:VTHOCurrency
            }
        }
    }

    private env:any;
    private connex:ConnexPro;
    private tokenList:Array<Currency> = [];
}