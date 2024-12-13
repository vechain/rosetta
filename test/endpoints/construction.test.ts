import { describe, expect, inject, it } from "vitest";
import { ConstructionApi, CurveType, SignatureType } from "../generated/api";
import { hdNode, networkIdentifier, vthoAddress } from "../constants";
import { abi, secp256k1 as Sign } from "thor-devkit";
import { Erc20ABI } from "../abis";
import { del } from "request";
import { pollReceipt } from "../helpers/transactions/pollReceipt";

describe("construction", async () => {
  const client = new ConstructionApi(inject("rosettaURL"));

  const delegator = hdNode.derive(0);
  const origin = hdNode.derive(1);
  const receiver = hdNode.derive(2);

  it("should be able to fetch metadata", async () => {
    const transferABI = new abi.Function(Erc20ABI.transfer);
    const data = transferABI.encode(receiver.address, 100);

    const metadata = await client.constructionMetadata({
      networkIdentifier,
      options: {
        clauses: [
          {
            to: vthoAddress,
            value: "0x0",
            data,
          },
        ],
      },
    });

    expect((metadata.body.metadata as any).chainTag).toBe(246);
    expect(metadata.body.suggestedFee?.length).toBe(1);
    expect(metadata.body.suggestedFee![0].value).toBe("-840000000000000000");
    expect(metadata.body.suggestedFee![0].currency.symbol).toBe("VTHO");
    expect(metadata.body.suggestedFee![0].currency.metadata).toEqual({
      contractAddress: vthoAddress,
    });
  });

  it("should be able to send a delegated transaction", async () => {
    const preprocessBody = {
      networkIdentifier: {
        blockchain: "vechainthor",
        network: "custom",
      },
      metadata: {
        fee_delagator_account: delegator.address,
      },
      operations: [
        {
          operationIdentifier: {
            index: 0,
            networkIndex: 0,
          },
          type: "Transfer",
          status: "None",
          account: {
            address: receiver.address,
          },
          amount: {
            value: "10000",
            currency: {
              symbol: "VET",
              decimals: 18,
            },
            metadata: {},
          },
        },
        {
          operationIdentifier: {
            index: 0,
            networkIndex: 1,
          },
          type: "Transfer",
          status: "None",
          account: {
            address: origin.address,
          },
          amount: {
            value: "-10000",
            currency: {
              symbol: "VET",
              decimals: 18,
            },
            metadata: {},
          },
        },
        {
          operationIdentifier: {
            index: 0,
            networkIndex: 2,
          },
          type: "FeeDelegation",
          status: "None",
          account: {
            address: delegator.address,
          },
          amount: {
            value: "-210000000000000000",
            currency: {
              symbol: "VTHO",
              decimals: 18,
              metadata: {
                contractAddress: "0x0000000000000000000000000000456E65726779",
              },
            },
            metadata: {},
          },
        },
      ],
    };
    const preprocess = await client.constructionPreprocess(preprocessBody);

    const options = preprocess.body.options as any;
    expect(options.clauses[0].to).toBe(receiver.address);
    expect(options.clauses[0].value).toBe("10000");
    expect(preprocess.body.requiredPublicKeys?.length).toBe(2);
    expect(preprocess.body.requiredPublicKeys![0].address).toBe(origin.address);
    expect(preprocess.body.requiredPublicKeys![1].address).toBe(
      delegator.address,
    );

    const publicKeys = [origin, delegator].map((node) => {
      const publicKey = node.publicKey.toString("hex");
      const xHex = publicKey.slice(2, 66); // First 64 hex characters after '04' -> X coordinate
      const yHex = publicKey.slice(66);
      const y = BigInt(`0x${yHex}`);
      const prefix = y % BigInt(2) === BigInt(0) ? "02" : "03";
      const compressedKey = prefix + xHex;
      return {
        curveType: CurveType.Secp256k1,
        hexBytes: compressedKey,
      };
    });

    const metadata = await client.constructionMetadata({
      networkIdentifier,
      options,
      publicKeys,
    });

    const payload = await client.constructionPayloads({
      networkIdentifier,
      operations: preprocessBody.operations,
      metadata: {
        ...metadata.body.metadata,
        fee_delagator_account: delegator.address,
      },
      publicKeys,
    });

    const originSignature = Sign.sign(
      Buffer.from(payload.body.payloads[0].hexBytes, "hex"),
      origin.privateKey!,
    );
    const delegatorSignature = Sign.sign(
      Buffer.from(payload.body.payloads[1].hexBytes, "hex"),
      delegator.privateKey!,
    );

    const combine = await client.constructionCombine({
      networkIdentifier,
      unsignedTransaction: payload.body.unsignedTransaction,
      signatures: [
        {
          signingPayload: {
            address: origin.address,
            hexBytes: payload.body.payloads[0].hexBytes,
            signatureType: SignatureType.EcdsaRecovery,
            accountIdentifier: {
              address: origin.address,
            },
          },
          publicKey: publicKeys[0],
          signatureType: SignatureType.EcdsaRecovery,
          hexBytes: "0x" + originSignature.toString("hex"),
        },
        {
          signingPayload: {
            address: delegator.address,
            hexBytes: payload.body.payloads[1].hexBytes,
            signatureType: SignatureType.EcdsaRecovery, // Updated to ecdsa_recovery
            accountIdentifier: {
              address: delegator.address,
            },
          },
          publicKey: publicKeys[1],
          signatureType: SignatureType.EcdsaRecovery, // Updated to ecdsa_recovery
          hexBytes: "0x" + delegatorSignature.toString("hex"),
        },
      ],
    });

    const txBodyRegex = /0x([0-9a-fA-F]{2}){1,}/g;
    expect(combine.body.signedTransaction.match(txBodyRegex)).toBeTruthy();

    const submit = await client.constructionSubmit({
      networkIdentifier,
      signedTransaction: combine.body.signedTransaction,
    });

    const receipt = await pollReceipt(submit.body.transactionIdentifier.hash);
    expect(receipt.reverted).toBeFalsy();
  });
});
