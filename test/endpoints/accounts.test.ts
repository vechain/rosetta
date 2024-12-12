import { describe, expect, inject, it } from "vitest";
import { AccountApi, PartialBlockIdentifier } from "../generated/api";
import { accounts, connex, networkIdentifier, vthoAddress } from "../constants";
import { Erc20ABI } from "../abis";
import { pollReceipt } from "../helpers/transactions/pollReceipt";

describe("accounts", async () => {
  const { thor, vendor } = await connex;
  const client = new AccountApi(inject("rosettaURL"));

  const newAddress = "0x87AA2B76f29583E4A9095DBb6029A9C41994E25B";

  const vthoClauus = thor
    .account(vthoAddress)
    .method(Erc20ABI.transfer)
    .asClause(newAddress, 100);
  const vetClause = {
    to: newAddress,
    value: 100,
    data: "0x",
  };

  const { txid } = await vendor
    .sign("tx", [vthoClauus, vetClause])
    .signer(accounts[2].address)
    .request();

  const receipt = await pollReceipt(txid);

  it("should be able to fetch an accounts balance", async () => {
    const res = await getBalance(accounts[0].address, {
      index: receipt.meta.blockNumber,
    });

    expect(res.body.balances[0].value).toBe("1000000000000000000000000000");
    // VTHO is generated every block
    expect(res.body.balances[1].value.length).toBe(
      "1000000000000000000000000000".length,
    );

    const res2 = await getBalance(accounts[0].address, {
      hash: receipt.meta.blockID,
    });
    expect(res2.body.balances[0].value).toBe("1000000000000000000000000000");
    // VTHO is generated every block
    expect(res2.body.balances[1].value.length).toBe(
      "1000000000000000000000000000".length,
    );
  });

  it("should be able to fetch a new accounts balance", async () => {
    expect(receipt.reverted).toBe(false);

    const res = await getBalance(newAddress, {
      index: receipt.meta.blockNumber,
    });

    expect(res.body.balances[0].value).toBe("100");
    expect(res.body.balances[1].value).toBe("100");

    const res2 = await getBalance(newAddress, { hash: receipt.meta.blockID });

    expect(res2.body.balances[0].value).toBe("100");
    expect(res2.body.balances[1].value).toBe("100");
  });

  it("should NOT be able to fetch an accounts coins", async () => {
    await expect(() =>
      client.accountCoins({
        networkIdentifier,
        accountIdentifier: {
          address: accounts[0].address,
        },
        includeMempool: true,
      }),
    ).rejects.toThrow();
  });

  const getBalance = async (
    address: string,
    blockIdentifier: PartialBlockIdentifier,
  ) => {
    return await client.accountBalance({
      accountIdentifier: {
        address,
      },
      networkIdentifier,
      blockIdentifier,
      currencies: [
        {
          symbol: "VET",
          decimals: 18,
        },
        {
          symbol: "VTHO",
          decimals: 18,
          metadata: {
            contractAddress: vthoAddress,
          },
        },
      ],
    });
  };
});
