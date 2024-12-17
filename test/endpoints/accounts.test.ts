import { describe, expect, inject, it } from "vitest";
import { AccountApi, PartialBlockIdentifier } from "../generated/api";
import { accounts, connex, networkIdentifier, vthoAddress } from "../constants";
import { Erc20ABI } from "../abis";
import { pollReceipt } from "../helpers/transactions/pollReceipt";
import { HDNode, mnemonic } from "thor-devkit";

describe("accounts", async () => {
  const { thor, vendor } = await connex;
  const client = new AccountApi(inject("rosettaURL"));

  const newAddress = HDNode.fromMnemonic(mnemonic.generate()).address;

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
    .signer(accounts[0].address)
    .request();

  const receipt = await pollReceipt(txid);

  it("should be able to fetch an accounts balance", async () => {
    const res = await getBalance(accounts[9].address, {
      index: receipt.meta.blockNumber,
    });

    expect(res.body.balances[0].value).toBe("1000000000000000000000000000");
    // VTHO is generated every block
    expect(res.body.balances[1].value.length).toBe(
      "1000000000000000000000000000".length,
    );

    const res2 = await getBalance(accounts[9].address, {
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
