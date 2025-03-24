import { describe, expect, inject, it } from "vitest";
import { CallApi, EventsApi } from "../generated/api";
import { accounts, connex, networkIdentifier, vthoAddress } from "../constants";
import { Erc20ABI } from "../abis";
import { pollReceipt } from "../helpers/transactions/pollReceipt";

describe("events", async () => {
  const client = new EventsApi(inject("rosettaURL"));

  const { thor } = await connex;

  const newAddress = "0xc7AA2B76f29583E4A9095DBb6029A9C41994Eabc";
  const tx = await thor
    .account(vthoAddress)
    .method(Erc20ABI.transfer)
    .transact(newAddress, 100)
    .signer(accounts[5].address)
    .request();

  const receipt = await pollReceipt(tx.txid);

  it("should be able to fetch events", async () => {
    let offset = receipt.meta.blockNumber - 10;
    if (offset < 0) {
      offset = 0;
    }
    const res = await client.eventsBlocks({
      networkIdentifier,
      offset: offset,
      limit: 20,
    });

    expect(
      res.body.events.some(
        (event) => event.blockIdentifier.hash === receipt.meta.blockID,
      ),
    ).toBe(true);
  });
});
