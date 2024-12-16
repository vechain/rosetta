import { describe, expect, inject, it } from "vitest";
import { CallApi, NetworkApi } from "../generated/api";
import { accounts, connex, networkIdentifier } from "../constants";

describe("network", async () => {
  const client = new NetworkApi(inject("rosettaURL"));
  const { thor } = await connex;

  it("should be able to fetch network list", async () => {
    const res = await client.networkList({});
    expect(res.body.networkIdentifiers.length).toBeGreaterThan(0);
  });

  it("should be able to fetch network options", async () => {
    const res = await client.networkOptions({
      networkIdentifier,
    });
    expect(res.body.version.rosettaVersion).toEqual("1.4.12");
    expect(
      res.body.allow.operationTypes.some((type) => type === "Transfer"),
    ).toBe(true);
    expect(res.body.allow.operationTypes.some((type) => type === "Fee")).toBe(
      true,
    );
    expect(res.body.allow.operationTypes.some((type) => type === "None")).toBe(
      true,
    );
    expect(
      res.body.allow.operationTypes.some((type) => type === "FeeDelegation"),
    ).toBe(true);
  });

  it("should be able to fetch network status", async () => {
    const res = await client.networkStatus({
      networkIdentifier,
    });
    expect(res.body.currentBlockTimestamp).toBeGreaterThan(0);
    expect(res.body.genesisBlockIdentifier.hash).toEqual(thor.genesis.id);
  });
});
