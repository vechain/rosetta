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

/**
 * A NetworkRequest is utilized to retrieve some data specific exclusively to a NetworkIdentifier.
 */
export class NetworkRequest {
  "networkIdentifier": NetworkIdentifier;
  "metadata"?: object;

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
      name: "metadata",
      baseName: "metadata",
      type: "object",
    },
  ];

  static getAttributeTypeMap() {
    return NetworkRequest.attributeTypeMap;
  }
}