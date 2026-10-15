import { SOLO_ACCOUNTS, VTHO, networkIdentifier, randomAddress } from '../config';
import { TransferIntent, sendTransfer, waitForPacked } from '../utils/construction';
import { comparable, expectedOperations } from '../utils/expected';
import { rosetta } from '../utils/rosettaClient';
import { ThorReceipt, thor } from '../utils/thorClient';

const [sender, delegator] = SOLO_ACCOUNTS;

interface PackedTx {
    hash: string,
    receipt: ThorReceipt
}

const packed: Record<string, PackedTx> = {};

const cases: Array<[string, Omit<TransferIntent, 'from' | 'to'>]> = [
    ['VET transfer', { amount: '1000' }],
    ['VTHO transfer', { amount: '1000', currency: VTHO }],
    ['fee-delegated VET transfer', { amount: '1000', delegator }]
];

beforeAll(async () => {
    for (const [name, intent] of cases) {
        const hash = await sendTransfer({ from: sender, to: randomAddress(), ...intent });
        packed[name] = { hash, receipt: await waitForPacked(hash) };
    }
});

describe('Block API vs thor', () => {
    it('genesis block matches thor and is its own parent', async () => {
        const response = await rosetta.call('/block', { block_identifier: { index: 0 } });
        const genesis = await thor.block(0);
        expect(response.block.block_identifier).toEqual({ index: 0, hash: genesis.id });
        expect(response.block.parent_block_identifier).toEqual({ index: 0, hash: genesis.id });
        expect(response.block.timestamp).toBe(genesis.timestamp * 1000);
    });

    describe.each(cases)('%s', (name) => {
        it('/block header and transaction list match thor', async () => {
            const { hash, receipt } = packed[name];
            const response = await rosetta.call('/block', { block_identifier: { index: receipt.meta.blockNumber } });
            const thorBlock = await thor.block(receipt.meta.blockNumber);

            expect(response.block.block_identifier).toEqual({ index: thorBlock.number, hash: thorBlock.id });
            expect(response.block.parent_block_identifier).toEqual({ index: thorBlock.number - 1, hash: thorBlock.parentID });
            expect(response.block.timestamp).toBe(thorBlock.timestamp * 1000);

            const listed = [
                ...response.block.transactions.map((t: { transaction_identifier: { hash: string } }) => t.transaction_identifier.hash),
                ...(response.other_transactions ?? []).map((t: { hash: string }) => t.hash)
            ];
            expect(listed.sort()).toEqual([...thorBlock.transactions].sort());
            expect(listed).toContain(hash);
        });

        it('/block operations match the thor receipt', async () => {
            const { hash, receipt } = packed[name];
            const response = await rosetta.call('/block', { block_identifier: { hash: receipt.meta.blockID } });
            const tx = response.block.transactions.find((t: { transaction_identifier: { hash: string } }) => t.transaction_identifier.hash === hash);
            expect(comparable(tx.operations)).toEqual(expectedOperations(receipt));
        });

        it('/block/transaction matches the transaction in /block', async () => {
            const { hash, receipt } = packed[name];
            const blockIdentifier = { index: receipt.meta.blockNumber, hash: receipt.meta.blockID };
            const block = await rosetta.call('/block', { block_identifier: blockIdentifier });
            const response = await rosetta.call('/block/transaction', {
                block_identifier: blockIdentifier,
                transaction_identifier: { hash }
            });
            const fromBlock = block.block.transactions.find((t: { transaction_identifier: { hash: string } }) => t.transaction_identifier.hash === hash);
            expect(response.transaction).toEqual(fromBlock);
        });
    });
});

describe('Block API chain head', () => {
    it('/block without index or hash returns the current block', async () => {
        const status = await rosetta.call('/network/status');
        const response = await rosetta.call('/block', { block_identifier: {} });
        expect(response.block.block_identifier.index).toBeGreaterThanOrEqual(status.current_block_identifier.index);
        const thorBlock = await thor.block(response.block.block_identifier.index);
        expect(response.block.block_identifier.hash).toBe(thorBlock.id);
    });

    // Rosetta follows the chain head through connex, which can lag thor by
    // several seconds on solo. A block thor already has but Rosetta does not
    // report yet must be rejected, never returned without its transactions.
    it('a block newer than the reported current block is rejected or complete', async () => {
        const hash = await sendTransfer({ from: sender, to: randomAddress(), amount: '1' });
        const receipt = await thor.waitForReceipt(hash);
        const thorBlock = await thor.block(receipt.meta.blockNumber);

        const response = await rosetta.postRaw<any>('/block', {
            network_identifier: networkIdentifier,
            block_identifier: { index: receipt.meta.blockNumber }
        });
        const outcome = response.status === 200
            ? { transactions: response.data.block.transactions.map((t: { transaction_identifier: { hash: string } }) => t.transaction_identifier.hash).sort() }
            : { code: response.data.code };
        expect([{ transactions: [...thorBlock.transactions].sort() }, { code: 3 }]).toContainEqual(outcome);
    });
});

describe('Events API vs thor', () => {
    it('/events/blocks lists thor blocks in sequence', async () => {
        const response = await rosetta.call('/events/blocks', { offset: 0, limit: 10 });
        const best = await thor.best();
        expect(response.max_sequence).toBeLessThanOrEqual(best.number);
        expect(response.events).toHaveLength(Math.min(10, response.max_sequence + 1));

        for (const [i, event] of response.events.entries()) {
            const thorBlock = await thor.block(i);
            expect(event).toEqual({
                sequence: i,
                block_identifier: { index: i, hash: thorBlock.id },
                type: 'block_added'
            });
        }
    });
});
