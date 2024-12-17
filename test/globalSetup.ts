import type { GlobalSetupContext } from "vitest/node";
import { dockerCompose } from "./helpers/compose/testContainer";
import { StartedDockerComposeEnvironment } from "testcontainers";
import ConnexPro from "../src/utils/connexPro";

let compose: StartedDockerComposeEnvironment;

export async function setup({ provide }: GlobalSetupContext) {
  console.log("Starting docker-compose");
  compose = await dockerCompose();
  const rosetta = compose.getContainer("rosetta");
  if (!rosetta) {
    throw new Error("Rosetta container not found");
  }
  const port = rosetta.getMappedPort(8080);
  if (!port) {
    throw new Error("Rosetta port not found");
  }
  console.log(`Rosetta running on http://localhost:${port}`);
  provide("rosettaURL", `http://localhost:${port}`);

  const thorPort = rosetta.getMappedPort(8669);
  if (!thorPort) {
    throw new Error("Thor port not found");
  }
  provide("thorURL", `http://localhost:${thorPort}`);

  console.log("docker-compose started, waiting for a block to mine...");

  const { thor } = await ConnexPro.instance(`http://localhost:${thorPort}`);

  await thor.ticker().next();
}

export async function teardown() {
  if (!compose) {
    return;
  }
  console.log("Stopping docker-compose");
  await compose.down();
  console.log("docker-compose stopped");
}

declare module "vitest" {
  export interface ProvidedContext {
    rosettaURL: string;
    thorURL: string;
  }
}
