import { VTHO_CONTRACT_ADDRESS } from '../config';
import { ThorReceipt, ThorTransaction } from './thorClient';

// Derives, from thor's own receipt, the operations Rosetta must report for a
// packed transaction. This is an independent re-implementation of the mapping
// in src/common/transConverter.ts, used as the reference in cross-checks.

const TRANSFER_EVENT_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

export interface ComparableOperation {
    index: number,
    network_index?: number,
    type: string,
    status?: string,
    address?: string,
    value?: string,
    symbol?: string
}

interface RosettaOperation {
    operation_identifier: { index: number, network_index?: number },
    type: string,
    status?: string,
    account?: { address: string },
    amount?: { value: string, currency: { symbol: string } }
}

export const comparable = (operations: RosettaOperation[]): ComparableOperation[] =>
    operations.map(op => ({
        index: op.operation_identifier.index,
        network_index: op.operation_identifier.network_index,
        type: op.type,
        status: op.status,
        address: op.account?.address.toLowerCase(),
        value: op.amount?.value,
        symbol: op.amount?.currency.symbol
    }));

const topicToAddress = (topic: string): string => '0x' + topic.slice(26).toLowerCase();

export const expectedOperations = (receipt: ThorReceipt, tx: Pick<ThorTransaction, 'delegator'>): ComparableOperation[] => {
    const status = receipt.reverted ? 'Reverted' : 'Succeeded';
    const result: Omit<ComparableOperation, 'index'>[] = [];

    receipt.outputs.forEach((output, clauseIndex) => {
        for (const transfer of output.transfers) {
            const value = BigInt(transfer.amount);
            result.push({ network_index: clauseIndex, type: 'Transfer', status, address: transfer.sender.toLowerCase(), value: (-value).toString(10), symbol: 'VET' });
            result.push({ network_index: clauseIndex, type: 'Transfer', status, address: transfer.recipient.toLowerCase(), value: value.toString(10), symbol: 'VET' });
        }
        for (const event of output.events) {
            if (event.address.toLowerCase() !== VTHO_CONTRACT_ADDRESS || event.topics[0] !== TRANSFER_EVENT_TOPIC) {
                continue;
            }
            const value = BigInt(event.data);
            result.push({ network_index: clauseIndex, type: 'Transfer', status, address: topicToAddress(event.topics[1]), value: (-value).toString(10), symbol: 'VTHO' });
            result.push({ network_index: clauseIndex, type: 'Transfer', status, address: topicToAddress(event.topics[2]), value: value.toString(10), symbol: 'VTHO' });
        }
    });

    // VIP-191 delegated (the delegator may be the origin itself) or paid by a sponsor.
    const delegated = tx.delegator !== null || receipt.gasPayer.toLowerCase() !== receipt.meta.txOrigin.toLowerCase();
    result.push({
        network_index: receipt.outputs.length,
        type: delegated ? 'FeeDelegation' : 'Fee',
        status,
        address: receipt.gasPayer.toLowerCase(),
        value: (-BigInt(receipt.paid)).toString(10),
        symbol: 'VTHO'
    });

    return result.map((op, index) => ({ index, ...op }));
};
