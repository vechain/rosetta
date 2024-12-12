import { describe, expect, inject, it } from "vitest";
import { BlockApi } from "../generated/api";
import { accounts, connex, networkIdentifier, vthoAddress } from "../constants";
import { Erc20ABI } from "../abis";
import { pollReceipt } from "../helpers/transactions/pollReceipt";

describe("blocks", async () => {
  const client = new BlockApi(inject("rosettaURL"));
  const { thor } = await connex;

  const newAddress = "0xc7AA2B76f29583E4A9095DBb6029A9C41994Eabc";
  const tx = await thor
    .account(vthoAddress)
    .method(Erc20ABI.transfer)
    .transact(newAddress, 100)
    .signer(accounts[1].address)
    .request();

  const receipt = await pollReceipt(tx.txid);

  it("should be able to fetch a block", async () => {
    const block = await client.block({
      networkIdentifier,
      blockIdentifier: {
        hash: receipt.meta.blockID,
      },
    });

    expect(block.body.block?.transactions?.length).toBeGreaterThan(0);
    expect(
      block.body.block?.transactions.some(
        (tx) => tx.transactionIdentifier.hash === receipt.meta.txID,
      ),
    ).toBe(true);
    expect(block.body.block?.blockIdentifier.hash).toBe(receipt.meta.blockID);
    expect(block.body.block?.blockIdentifier.index).toBe(
      receipt.meta.blockNumber,
    );
    expect(block.body.block?.parentBlockIdentifier.index).toBe(
      receipt.meta.blockNumber - 1,
    );
    expect(block.body.block?.timestamp).toBe(
      receipt.meta.blockTimestamp * 1000,
    );
  });

  it("should be able to fetch a block transaction", async () => {
    const block = await client.blockTransaction({
      networkIdentifier,
      blockIdentifier: {
        hash: receipt.meta.blockID,
        index: receipt.meta.blockNumber,
      },
      transactionIdentifier: {
        hash: tx.txid,
      },
    });

    expect(block.body.transaction.transactionIdentifier.hash).toBe(tx.txid);
    expect(block.body.transaction.operations?.length).toBeGreaterThan(1);
    expect(block.body.transaction.operations).toEqual([
      {
        operationIdentifier: {
          index: 0,
          networkIndex: 0,
        },
        type: "Transfer",
        status: "Succeeded",
        account: {
          address: accounts[1].address.toLowerCase(),
        },
        amount: {
          value: "-100",
          currency: {
            symbol: "VTHO",
            decimals: 18,
            metadata: {
              contractAddress: vthoAddress.toLowerCase(),
            },
          },
        },
      },
      {
        operationIdentifier: {
          index: 1,
          networkIndex: 0,
        },
        type: "Transfer",
        status: "Succeeded",
        account: {
          address: newAddress.toLowerCase(),
        },
        amount: {
          value: "100",
          currency: {
            symbol: "VTHO",
            decimals: 18,
            metadata: {
              contractAddress: vthoAddress.toLowerCase(),
            },
          },
        },
      },
      {
        operationIdentifier: {
          index: 2,
          networkIndex: 1,
        },
        type: "Fee",
        status: "Succeeded",
        account: {
          address: accounts[1].address.toLowerCase(),
        },
        amount: {
          value: "-511980000000000000",
          currency: {
            symbol: "VTHO",
            decimals: 18,
            metadata: {
              contractAddress: vthoAddress.toLowerCase(),
            },
          },
        },
      },
    ]);
  });
});
