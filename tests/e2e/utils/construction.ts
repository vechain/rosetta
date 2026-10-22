import { ethers } from 'ethers';
import { SoloAccount, VET } from '../config';
import { rosetta } from './rosettaClient';
import { ThorReceipt, thor } from './thorClient';

// Drives the Rosetta Construction API end to end:
// preprocess -> metadata -> payloads -> parse -> combine -> parse -> hash.

export type TransactionType = 'legacy' | 'dynamic';

export interface Currency {
    symbol: string,
    decimals: number,
    metadata?: Record<string, unknown>
}

export interface TransferIntent {
    from: SoloAccount,
    to: string,
    amount: string,
    currency?: Currency,
    transactionType?: TransactionType,
    delegator?: SoloAccount
}

export interface SigningPayload {
    address: string,
    account_identifier?: { address: string },
    hex_bytes: string,
    signature_type: string
}

export interface ConstructedTransfer {
    operations: object[],
    preprocess: any,
    metadata: any,
    payloads: { unsigned_transaction: string, payloads: SigningPayload[] },
    parsedUnsigned: any,
    combine: { signed_transaction: string },
    parsedSigned: any,
    hash: string
}

export const transferOperations = (intent: TransferIntent): object[] => {
    const currency = intent.currency ?? VET;
    return [
        {
            operation_identifier: { index: 0 },
            type: 'Transfer',
            account: { address: intent.from.address },
            amount: { value: `-${intent.amount}`, currency }
        },
        {
            operation_identifier: { index: 1 },
            type: 'Transfer',
            account: { address: intent.to },
            amount: { value: intent.amount, currency }
        }
    ];
};

/** Signs a Rosetta signing payload: 65 bytes r || s || recovery id, hex without prefix. */
export const signPayload = (account: SoloAccount, payload: SigningPayload): string => {
    const signature = new ethers.SigningKey('0x' + account.privateKey).sign('0x' + payload.hex_bytes);
    return signature.r.slice(2) + signature.s.slice(2) + (signature.v - 27).toString(16).padStart(2, '0');
};

export const constructTransfer = async (intent: TransferIntent): Promise<ConstructedTransfer> => {
    const operations = transferOperations(intent);
    const delegationMetadata = intent.delegator ? { fee_delegator_account: intent.delegator.address } : undefined;

    const preprocess = await rosetta.call('/construction/preprocess', { operations, metadata: delegationMetadata });

    const metadata = await rosetta.call('/construction/metadata', {
        options: { ...preprocess.options, transactionType: intent.transactionType ?? 'dynamic' }
    });

    const publicKeys = [intent.from, ...(intent.delegator ? [intent.delegator] : [])]
        .map(account => ({ hex_bytes: account.publicKey, curve_type: 'secp256k1' }));
    const payloads = await rosetta.call('/construction/payloads', {
        operations,
        public_keys: publicKeys,
        metadata: { ...metadata.metadata, ...delegationMetadata }
    });

    const parsedUnsigned = await rosetta.call('/construction/parse', {
        signed: false,
        transaction: payloads.unsigned_transaction
    });

    const signers = [intent.from, ...(intent.delegator ? [intent.delegator] : [])];
    const signatures = (payloads.payloads as SigningPayload[]).map((payload, i) => ({
        signing_payload: payload,
        public_key: publicKeys[i],
        signature_type: 'ecdsa_recovery',
        hex_bytes: signPayload(signers[i], payload)
    }));
    const combine = await rosetta.call('/construction/combine', {
        unsigned_transaction: payloads.unsigned_transaction,
        signatures
    });

    const parsedSigned = await rosetta.call('/construction/parse', {
        signed: true,
        transaction: combine.signed_transaction
    });

    const hashResponse = await rosetta.call('/construction/hash', { signed_transaction: combine.signed_transaction });

    return {
        operations,
        preprocess,
        metadata,
        payloads,
        parsedUnsigned,
        combine,
        parsedSigned,
        hash: hashResponse.transaction_identifier.hash
    };
};

/** Submits a signed transaction through Rosetta and returns the transaction id. */
export const submitTransaction = async (signedTransaction: string): Promise<string> => {
    const response = await rosetta.call('/construction/submit', { signed_transaction: signedTransaction });
    return response.transaction_identifier.hash;
};

/** Constructs and submits a transfer; returns the transaction id. */
export const sendTransfer = async (intent: TransferIntent): Promise<string> => {
    const constructed = await constructTransfer(intent);
    return submitTransaction(constructed.combine.signed_transaction);
};

/** Waits until thor packs the transaction and Rosetta has caught up with its block. */
export const waitForPacked = async (txId: string): Promise<ThorReceipt> => {
    const receipt = await thor.waitForReceipt(txId);
    await rosetta.waitForBlock(receipt.meta.blockNumber);
    return receipt;
};
