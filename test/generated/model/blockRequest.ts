/**
 * Rosetta
 * Build Once. Integrate Your Blockchain Everywhere.
 *
 * The version of the OpenAPI document: 1.4.13
 *
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */

import { RequestFile } from "./models";
import { NetworkIdentifier } from "./networkIdentifier";
import { PartialBlockIdentifier } from "./partialBlockIdentifier";

/**
 * A BlockRequest is utilized to make a block request on the /block endpoint.
 */
export class BlockRequest {
  "networkIdentifier": NetworkIdentifier;
  "blockIdentifier": PartialBlockIdentifier;

  static discriminator: string | undefined = undefined;

  static attributeTypeMap: Array<{
    name: string;
    baseName: string;
    type: string;
  }> = [
    {
      name: "networkIdentifier",
      baseName: "network_identifier",
      type: "NetworkIdentifier",
    },
    {
      name: "blockIdentifier",
      baseName: "block_identifier",
      type: "PartialBlockIdentifier",
    },
  ];

  static getAttributeTypeMap() {
    return BlockRequest.attributeTypeMap;
  }
}