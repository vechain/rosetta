import { Transaction as VeTransaction } from "thor-devkit";
import { VETCurrency, VTHOCurrency } from "..";
import { Transaction } from "../common/types/transaction";
import ConnexPro from "../utils/connexPro";
import { VIP180Token } from "../utils/vip180Token";
import { CheckSchema } from './checkSchema';
import { Currency } from "./types/currency";
import { OperationIdentifier } from "./types/identifiers";
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

    private createOperationIdentifier(index: number, networkIndex: number): OperationIdentifier {
        return {
            index,
            network_index: networkIndex
        };
    }

    private createCallOperation(origin: string, clause: VeTransaction.Clause, index: number): Operation {
        return {
            operation_identifier: this.createOperationIdentifier(0, index),
            type: OperationType.Call,
            account: {
                address: origin
            },
            amount: {
                value: '0',
                currency: VETCurrency
            },
            metadata: {
                data: clause.data,
                to: clause.to
            }
        };
    }

    private createTransferOperations(origin: string, clause: VeTransaction.Clause, index: number, token: Currency): Operation[] {
        const decode = VIP180Token.decodeCallData(clause.data, 'transfer');
        const sendOp: Operation = {
            operation_identifier: this.createOperationIdentifier(0, index),
            type: OperationType.Transfer,
            account: {
                address: origin
            },
            amount: {
                value: (BigInt(decode._amount) * BigInt(-1)).toString(10),
                currency: token
            }
        };
        const receiptOp: Operation = {
            operation_identifier: this.createOperationIdentifier(0, index),
            type: OperationType.Transfer,
            account: {
                address: decode._to as string
            },
            amount: {
                value: BigInt(decode._amount).toString(10),
                currency: token
            }
        };
        return [sendOp, receiptOp];
    }

    private createVETTransferOperations(origin: string, clause: VeTransaction.Clause, index: number): Operation[] {
        const sendOp: Operation = {
            operation_identifier: this.createOperationIdentifier(0, index),
            type: OperationType.Transfer,
            account: {
                address: origin
            },
            amount: {
                value: (BigInt(clause.value) * BigInt(-1)).toString(10),
                currency: VETCurrency
            }
        };
        const receiptOp: Operation = {
            operation_identifier: this.createOperationIdentifier(0, index),
            type: OperationType.Transfer,
            account: {
                address: clause.to as string,
            },
            amount: {
                value: BigInt(clause.value).toString(10),
                currency: VETCurrency
            }
        };
        return [sendOp, receiptOp];
    }

    public async getDynamicGasPrice(): Promise<{
        baseFee: bigint,
        reward: bigint
    }> {
        const response = await this.connex.thor.fees.history().rewardPercentiles([50]).get();
        return {
            baseFee: BigInt(response.baseFeePerGas[0]),
            reward: BigInt(response.reward?.[0][0] ?? '0')
        }
    }

    private async calculateGasPrice(tx: Connex.Thor.Transaction): Promise<bigint> {
        if (tx.type === 81) {
            const { baseFee, reward } = await this.getDynamicGasPrice();
            return baseFee + reward;
        }
        return BigInt(this.env.config.baseGasPrice);
    }

    private async createFeeOperation(tx: Connex.Thor.Transaction, delegator: string | null | undefined, origin: string): Promise<Operation> {
        const isDelegation = CheckSchema.isAddress(delegator);
        const gasPrice = await this.calculateGasPrice(tx);
        return {
            operation_identifier: this.createOperationIdentifier(0, 0),
            type: isDelegation ? OperationType.FeeDelegation : OperationType.Fee,
            account: {
                address: isDelegation ? delegator! : origin
            },
            amount: {
                value: (BigInt(tx.gas) * BigInt(10**18) / gasPrice * BigInt(-1)).toString(10),
                currency: VTHOCurrency
            }
        };
    }

    private async processClause(clause: VeTransaction.Clause, index: number, origin: string): Promise<Operation[]> {
        if (clause.value == 0 || clause.value == '') {
            const token = this.tokenList.find(t => t.metadata.contractAddress == clause.to);
            if (token == undefined || clause.data.substring(10) != '0xa9059cbb') {
                const code = await this.connex.driver.getCode(clause.to as string, this.connex.thor.status.head.id);
                if (code && code.code !== '0x') {
                    return [this.createCallOperation(origin, clause, index)];
                }
                return [];
            }
            return this.createTransferOperations(origin, clause, index, token);
        }
        return this.createVETTransferOperations(origin, clause, index);
    }

    public async convertClausesToOperations(tx: Connex.Thor.Transaction, txrecp?: Connex.Thor.Transaction.Receipt | null): Promise<Operation[]> {
        let operations: Operation[] = [];
        const origin = tx.origin;
        const delegator = tx.delegator;

        for (let index = 0; index < tx.clauses.length; index++) {
            const clause = tx.clauses[index] as VeTransaction.Clause;
            const clauseOperations = await this.processClause(clause, index, origin);
            operations = operations.concat(clauseOperations);
        }

        operations.push(await this.createFeeOperation(tx, delegator, origin));

        if (txrecp) {
            for (const oper of operations) {
                oper.status = txrecp.reverted ? OperationStatus.Reverted : OperationStatus.Succeeded;
            }
            const payOp = operations.find(op => op.type == OperationType.Fee || op.type == OperationType.FeeDelegation)!;
            const gasPrice = await this.calculateGasPrice(tx);
            payOp.amount!.value = (BigInt(txrecp.gasUsed) * BigInt(10**18) / gasPrice * BigInt(-1)).toString(10);
        }

        return operations;
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