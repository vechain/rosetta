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

/**
 * The Version object is utilized to inform the client of the versions of different components of the Rosetta implementation.
 */
export class Version {
  /**
   * The rosetta_version is the version of the Rosetta interface the implementation adheres to. This can be useful for clients looking to reliably parse responses.
   */
  "rosettaVersion": string;
  /**
   * The node_version is the canonical version of the node runtime. This can help clients manage deployments.
   */
  "nodeVersion": string;
  /**
   * When a middleware server is used to adhere to the Rosetta interface, it should return its version here. This can help clients manage deployments.
   */
  "middlewareVersion"?: string;
  /**
   * Any other information that may be useful about versioning of dependent services should be returned here.
   */
  "metadata"?: object;

  static discriminator: string | undefined = undefined;

  static attributeTypeMap: Array<{
    name: string;
    baseName: string;
    type: string;
  }> = [
    {
      name: "rosettaVersion",
      baseName: "rosetta_version",
      type: "string",
    },
    {
      name: "nodeVersion",
      baseName: "node_version",
      type: "string",
    },
    {
      name: "middlewareVersion",
      baseName: "middleware_version",
      type: "string",
    },
    {
      name: "metadata",
      baseName: "metadata",
      type: "object",
    },
  ];

  static getAttributeTypeMap() {
    return Version.attributeTypeMap;
  }
}