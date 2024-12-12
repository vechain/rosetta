import { describe, expect, inject, it } from "vitest";
import { CallApi } from "../generated/api";
import { accounts, networkIdentifier } from "../constants";

describe("call", async () => {
  const client = new CallApi(inject("rosettaURL"));

  it("should NOT be able to fetch a call", async () => {
    try {
      await client.call({
        networkIdentifier,
        method: "transfer",
        parameters: {
          from: accounts[0].address,
          to: accounts[1].address,
          value: 100,
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
