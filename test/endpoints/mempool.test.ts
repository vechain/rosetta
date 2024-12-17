import { describe, expect, inject, it } from "vitest";
import { CallApi, MempoolApi } from "../generated/api";
import { accounts, connex, networkIdentifier, vthoAddress } from "../constants";
import { Erc20ABI } from "../abis";
import { pollReceipt } from "../helpers/transactions/pollReceipt";

describe("mempool", async () => {
  const client = new MempoolApi(inject("rosettaURL"));
  const { thor } = await connex;

  const newAddress = "0xc7AA2B76f29583E4A9095DBb6029A9C41994Eabc";
  const tx = await thor
    .account(vthoAddress)
    .method(Erc20ABI.transfer)
    .transact(newAddress, 100)
    .signer(accounts[6].address)
    .request();

  const receipt = await pollReceipt(tx.txid);

  it("should NOT be able fetch mempool details", async () => {
    try {
      await client.mempool({
        networkIdentifier,
      });
      // force the test to fail
      expect(1).toBe(2);
    } catch (error: any) {
      expect(error.statusCode).toBe(404);
      expect(error.name).toBe("HttpError");
      expect(error.body).toBe("Not Found");
    }
  });

  it("should NOT be able fetch mempool transaction details", async () => {
    try {
      await client.mempoolTransaction({
        networkIdentifier,
        transactionIdentifier: {
          hash: receipt.meta.txID,
        },
      });
      // force the test to fail
      expect(1).toBe(2);
    } catch (error: any) {
      expect(error.statusCode).toBe(404);
      expect(error.name).toBe("HttpError");
      expect(error.body).toBe("Not Found");
    }
  });
});
