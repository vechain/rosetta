import {
  DockerComposeEnvironment,
  Wait,
  StartedDockerComposeEnvironment,
} from "testcontainers";
import * as path from "path";

const composeFilePath = path.join(__dirname);
const composeFile = "docker-compose.yaml";

export function dockerCompose(): Promise<StartedDockerComposeEnvironment> {
  return new DockerComposeEnvironment(composeFilePath, composeFile)
    .withWaitStrategy("rosetta", Wait.forLogMessage("http://localhost:8669"))
    .withBuild()
    .up();
}