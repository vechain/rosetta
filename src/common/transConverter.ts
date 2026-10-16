import { Transaction as VeTransaction } from "thor-devkit";
import { VETCurrency, VTHOCurrency } from "..";
import { Transaction } from "../common/types/transaction";
import ConnexPro from "../utils/connexPro";
import { VIP180Token } from "../utils/vip180Token";
import { CheckSchema } from './checkSchema';
import { TokenCurrency } from "./types/currency";
import { Env } from "./types/env";
import { OperationIdentifier } from "./types/identifiers";
import { Operation, OperationStatus, OperationType } from "./types/operation";

export class TransactionConverter {

    public constructor(env:Env){
        this.env = env;
        this.connex = this.env.connex;
        this.tokenList = this.env.config.tokenlist;
    }

    public async parseRosettaTransaction(txid:string):Promise<Transaction>{
        const result:Transaction = {transaction_identifier:{hash:txid},operations:[]};
        const visitor = this.connex.thor.transaction(txid);
        const [tx, txRece] = await Promise.all([visitor.get(), visitor.getReceipt()]);
        if(txRece == undefined){
            throw new Error(`Receipt of transaction ${txid} not found`);
        }
        for(let index = 0; index < txRece.outputs.length; index++) {
            const opers = this.parseRosettaOperations(index,txRece);
            result.operations = result.operations.concat(opers);
        }
        // A VIP-191 delegated transaction is a fee delegation even when the
        // delegator is the origin; a sponsored one shows only in gasPayer.
        if(CheckSchema.isAddress(tx?.delegator) || txRece.gasPayer.toLowerCase() != txRece.meta.txOrigin.toLowerCase()){
            result.operations.push(this.feeDelegationOperation(txRece));
        } else {
            result.operations.push(this.feeOperation(txRece));
        }
        for(let index = 0; index < result.operations.length; index++ ){
            result.operations[index].operation_identifier.index = index;
            result.operations[index].status = txRece.reverted ? OperationStatus.Reverted : OperationStatus.Succeeded;
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

    private createTransferOperations(origin: string, clause: VeTransaction.Clause, index: number, token: TokenCurrency): Operation[] {
        const decode = VIP180Token.decodeCallData(clause.data, 'transfer');
        const sendOp: Operation = {
            operation_identifier: this.createOperationIdentifier(0, index),
            type: OperationType.Transfer,
            account: {
                address: origin
            },
            amount: {
                value: (BigInt(decode._amount as string) * BigInt(-1)).toString(10),
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
                value: BigInt(decode._amount as string).toString(10),
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
        try {
            const response = await this.connex.thor.fees.history().rewardPercentiles([50]).get();
            return {
                baseFee: BigInt(response.baseFeePerGas[0]),
                reward: BigInt(response.reward?.[0][0] ?? '0')
            }
        } catch (error) {
            // Since the node might be catching up with the chain, the actual last block - the backtrace limit
            // might be greater than the last block within the Rosetta Thor node, so we return 0 baseFee and reward
            // since we allow the user to build dynamic fee transactions also in this case
            console.warn('Network catching up, returning 0 baseFee and reward:', error);
            return {
                baseFee: BigInt(0),
                reward: BigInt(0)
            }
        }
    }

    /**
     * The highest gas price a pending transaction can be charged: for a dynamic
     * fee transaction min(maxFeePerGas, baseFee + maxPriorityFeePerGas), for a
     * legacy one baseGasPrice * (1 + gasPriceCoef / 255).
     */
    private async pendingGasPrice(tx: Connex.Thor.Transaction): Promise<bigint> {
        if (tx.type === 81) {
            const { baseFee } = await this.getDynamicGasPrice();
            const maxFee = BigInt(tx.maxFeePerGas ?? 0);
            const price = baseFee + BigInt(tx.maxPriorityFeePerGas ?? 0);
            return price < maxFee ? price : maxFee;
        }
        const baseGasPrice = BigInt(this.env.config.baseGasPrice);
        return baseGasPrice + baseGasPrice * BigInt(tx.gasPriceCoef ?? 0) / BigInt(255);
    }

    private async createFeeOperation(tx: Connex.Thor.Transaction): Promise<Operation> {
        const isDelegation = CheckSchema.isAddress(tx.delegator);
        const gasPrice = await this.pendingGasPrice(tx);
        return {
            operation_identifier: this.createOperationIdentifier(0, tx.clauses.length),
            type: isDelegation ? OperationType.FeeDelegation : OperationType.Fee,
            account: {
                address: isDelegation ? tx.delegator! : tx.origin
            },
            amount: {
                value: (BigInt(tx.gas) * gasPrice * BigInt(-1)).toString(10),
                currency: VTHOCurrency
            }
        };
    }

    private async processClause(clause: VeTransaction.Clause, index: number, origin: string): Promise<Operation[]> {
        if (clause.value == 0 || clause.value == '') {
            const token = this.tokenList.find(t => t.metadata.contractAddress == clause.to);
            if (token == undefined || clause.data.substring(0,10) != '0xa9059cbb') {
                const code = await this.connex.driver.getCode(clause.to as string, this.connex.thor.status.head.id);
                if (code.code !== '0x') {
                    return [this.createCallOperation(origin, clause, index)];
                }
                return [];
            }
            return this.createTransferOperations(origin, clause, index, token);
        }
        return this.createVETTransferOperations(origin, clause, index);
    }

    /**
     * Operations of a pending (not yet packed) transaction, derived from its
     * clauses. Packed transactions are converted from their receipt instead,
     * see parseRosettaTransaction.
     *
     * Data API operations must carry a status declared in /network/options;
     * a pending transaction has no outcome yet, so it is reported as None.
     */
    public async convertClausesToOperations(tx: Connex.Thor.Transaction): Promise<Operation[]> {
        let operations: Operation[] = [];

        for (let index = 0; index < tx.clauses.length; index++) {
            const clause = tx.clauses[index] as VeTransaction.Clause;
            const clauseOperations = await this.processClause(clause, index, tx.origin);
            operations = operations.concat(clauseOperations);
        }

        operations.push(await this.createFeeOperation(tx));
        operations.forEach((operation, index) => {
            operation.operation_identifier.index = index;
            operation.status = OperationStatus.None;
        });

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
                    const transEvents = VIP180Token.filterEvents([ev],ev.address,'Transfer');
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

    private env:Env;
    private connex:ConnexPro;
    private tokenList:Array<TokenCurrency> = [];
}