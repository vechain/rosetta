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
import { TransactionIdentifier } from "./transactionIdentifier";

/**
 * A MempoolResponse contains all transaction identifiers in the mempool for a particular network_identifier.
 */
export class MempoolResponse {
  "transactionIdentifiers": Array<TransactionIdentifier>;

  static discriminator: string | undefined = undefined;

  static attributeTypeMap: Array<{
    name: string;
    baseName: string;
    type: string;
  }> = [
    {
      name: "transactionIdentifiers",
      baseName: "transaction_identifiers",
      type: "Array<TransactionIdentifier>",
    },
  ];

  static getAttributeTypeMap() {
    return MempoolResponse.attributeTypeMap;
  }
}