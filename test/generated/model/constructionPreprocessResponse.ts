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
import { AccountIdentifier } from "./accountIdentifier";

/**
 * ConstructionPreprocessResponse contains `options` that will be sent unmodified to `/construction/metadata`. If it is not necessary to make a request to `/construction/metadata`, `options` should be omitted.   Some blockchains require the PublicKey of particular AccountIdentifiers to construct a valid transaction. To fetch these PublicKeys, populate `required_public_keys` with the AccountIdentifiers associated with the desired PublicKeys. If it is not necessary to retrieve any PublicKeys for construction, `required_public_keys` should be omitted.
 */
export class ConstructionPreprocessResponse {
  /**
   * The options that will be sent directly to `/construction/metadata` by the caller.
   */
  "options"?: object;
  "requiredPublicKeys"?: Array<AccountIdentifier>;

  static discriminator: string | undefined = undefined;

  static attributeTypeMap: Array<{
    name: string;
    baseName: string;
    type: string;
  }> = [
    {
      name: "options",
      baseName: "options",
      type: "object",
    },
    {
      name: "requiredPublicKeys",
      baseName: "required_public_keys",
      type: "Array<AccountIdentifier>",
    },
  ];

  static getAttributeTypeMap() {
    return ConstructionPreprocessResponse.attributeTypeMap;
  }
}