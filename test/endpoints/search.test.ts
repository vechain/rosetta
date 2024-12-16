import { describe, expect, inject, it } from "vitest";
import { CallApi, SearchApi } from "../generated/api";
import { accounts, connex, networkIdentifier, vthoAddress } from "../constants";
import { Erc20ABI } from "../abis";
import { pollReceipt } from "../helpers/transactions/pollReceipt";

describe("search", async () => {
  const client = new SearchApi(inject("rosettaURL"));

  const { thor } = await connex;

  const newAddress = "0xc7AA2B76f29583E4A9095DBb6029A9C41994Eabc";
  const tx = await thor
    .account(vthoAddress)
    .method(Erc20ABI.transfer)
    .transact(newAddress, 100)
    .signer(accounts[7].address)
    .request();

  const receipt = await pollReceipt(tx.txid);

  it("should be able to fetch a transaction", async () => {
    const res = await client.searchTransactions({
      networkIdentifier,
      transactionIdentifier: {
        hash: tx.txid,
      },
    });

    expect(
      res.body.transactions[0].transaction.transactionIdentifier.hash,
    ).toBe(receipt.meta.txID);
  });
});
