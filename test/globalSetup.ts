import type { GlobalSetupContext } from "vitest/node";
import { dockerCompose } from "./helpers/compose/testContainer";
import { StartedDockerComposeEnvironment } from "testcontainers";

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
  // sleep 10000s
  console.log(`Rosetta running on http://localhost:${port}`);
  provide("rosettaURL", `http://localhost:${port}`);

  const thorPort = rosetta.getMappedPort(8669);
  if (!thorPort) {
    throw new Error("Thor port not found");
  }
  provide("thorURL", `http://localhost:${thorPort}`);

  console.log("docker-compose started");
}

export async function teardown() {
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
