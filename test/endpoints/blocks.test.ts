import { describe, expect, inject, it } from "vitest";
import { BlockApi } from "../generated/api";
import { accounts, connex, networkIdentifier, vthoAddress } from "../constants";
import { Erc20ABI } from "../abis";
import { pollReceipt } from "../helpers/transactions/pollReceipt";
import { HDNode, mnemonic } from "thor-devkit";

describe("blocks", async () => {
  const client = new BlockApi(inject("rosettaURL"));
  const { thor } = await connex;

  const newAddress = HDNode.fromMnemonic(mnemonic.generate()).address;
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
    expect(block.body.transaction.operations[0].type).toBe("Transfer");
    expect(block.body.transaction.operations[0].status).toBe("Succeeded");
    expect(block.body.transaction.operations[0].account!.address).toBe(
      accounts[1].address.toLowerCase(),
    );
    expect(block.body.transaction.operations[0].amount!.value).toBe("-100");
    expect(block.body.transaction.operations[0].amount!.currency.symbol).toBe(
      "VTHO",
    );

    expect(block.body.transaction.operations[1].type).toBe("Transfer");
    expect(block.body.transaction.operations[1].status).toBe("Succeeded");
    expect(block.body.transaction.operations[1].account!.address).toBe(
      newAddress.toLowerCase(),
    );
    expect(block.body.transaction.operations[1].amount!.value).toBe("100");
    expect(block.body.transaction.operations[1].amount!.currency.symbol).toBe(
      "VTHO",
    );

    expect(block.body.transaction.operations[2].type).toBe("Fee");
    expect(block.body.transaction.operations[2].status).toBe("Succeeded");
    expect(block.body.transaction.operations[2].account!.address).toBe(
      accounts[1].address.toLowerCase(),
    );
    expect(block.body.transaction.operations[2].amount!.currency.symbol).toBe(
      "VTHO",
    );
  });
});
