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
import { Currency } from "./currency";

/**
 * Amount is some Value of a Currency. It is considered invalid to specify a Value without a Currency.
 */
export class Amount {
  /**
   * Value of the transaction in atomic units represented as an arbitrary-sized signed integer.  For example, 1 BTC would be represented by a value of 100000000.
   */
  "value": string;
  "currency": Currency;
  "metadata"?: object;

  static discriminator: string | undefined = undefined;

  static attributeTypeMap: Array<{
    name: string;
    baseName: string;
    type: string;
  }> = [
    {
      name: "value",
      baseName: "value",
      type: "string",
    },
    {
      name: "currency",
      baseName: "currency",
      type: "Currency",
    },
    {
      name: "metadata",
      baseName: "metadata",
      type: "object",
    },
  ];

  static getAttributeTypeMap() {
    return Amount.attributeTypeMap;
  }
}