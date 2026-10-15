import { SOLO_ACCOUNTS, VTHO, randomAddress } from '../config';
import { TransferIntent, constructTransfer, sendTransfer, submitTransaction, waitForPacked } from '../utils/construction';
import { comparable, expectedOperations } from '../utils/expected';
import { rosetta } from '../utils/rosettaClient';
import { thor } from '../utils/thorClient';

const [sender] = SOLO_ACCOUNTS;

interface Op {
    type: string,
    account: { address: string },
    amount: { value: string, currency: { symbol: string } }
}

describe('Mempool API vs thor', () => {
    // A submitted transaction stays in the pool until the next solo block,
    // so these checks run right after submission.
    it.each([
        ['dynamic', 'dynamic' as const],
        ['legacy', 'legacy' as const]
    ])('a just-submitted %s transaction is listed like thor /node/txpool', async (_, transactionType) => {
        const intent: TransferIntent = { from: sender, to: randomAddress(), amount: '1000', transactionType };
        const constructed = await constructTransfer(intent);
        const hash = await submitTransaction(constructed.combine.signed_transaction);

        const [mempool, txpool, mempoolTx] = await Promise.all([
            rosetta.call('/mempool'),
            thor.txpool(),
            rosetta.call('/mempool/transaction', { transaction_identifier: { hash } })
        ]);

        expect(txpool).toContain(hash);
        expect(mempool.transaction_identifiers).toContainEqual({ hash });
        expect(mempoolTx.transaction.transaction_identifier.hash).toBe(hash);

        const transfers = (mempoolTx.transaction.operations as Op[])
            .filter(op => op.type === 'Transfer')
            .map(op => ({ address: op.account.address, value: op.amount.value }));
        expect(transfers).toEqual(expect.arrayContaining((constructed.operations as Op[]).map(op => ({ address: op.account.address, value: op.amount.value }))));
    });

    it('the fee operation of a pending transaction equals gas × gas price', async () => {
        const constructed = await constructTransfer({ from: sender, to: randomAddress(), amount: '1000' });
        const hash = await submitTransaction(constructed.combine.signed_transaction);
        const mempoolTx = await rosetta.call('/mempool/transaction', { transaction_identifier: { hash } });
        const fee = (mempoolTx.transaction.operations as Op[]).find(op => op.type === 'Fee')!;
        const { gas, maxFeePerGas } = constructed.metadata.metadata;
        expect(BigInt(fee.amount.value)).toBe(-BigInt(gas) * BigInt(maxFeePerGas));
    });
});

describe('Search API vs thor', () => {
    const searchOperations = async (hash: string) => {
        const response = await rosetta.call('/search/transactions', { transaction_identifier: { hash } });
        const result = response.transactions[0];
        return { result, operations: result.transaction.operations };
    };

    it('locates the transaction in the block thor packed it in', async () => {
        const hash = await sendTransfer({ from: sender, to: randomAddress(), amount: '1000' });
        const receipt = await waitForPacked(hash);
        const { result } = await searchOperations(hash);
        expect(result.block_identifier).toEqual({ index: receipt.meta.blockNumber, hash: receipt.meta.blockID });
        expect(result.transaction.transaction_identifier).toEqual({ hash });
    });

    it('VET transfer operations match the thor receipt', async () => {
        const hash = await sendTransfer({ from: sender, to: randomAddress(), amount: '1000' });
        const receipt = await waitForPacked(hash);
        const { operations } = await searchOperations(hash);
        expect(comparable(operations)).toEqual(expectedOperations(receipt));
    });

    it('VTHO transfer operations match the thor receipt', async () => {
        const hash = await sendTransfer({ from: sender, to: randomAddress(), amount: '1000', currency: VTHO });
        const receipt = await waitForPacked(hash);
        const { operations } = await searchOperations(hash);
        expect(comparable(operations)).toEqual(expectedOperations(receipt));
    });
});
