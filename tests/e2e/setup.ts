import { exec } from 'child_process';
import { promisify } from 'util';
import { TestClient } from './utils/testClient';

const execAsync = promisify(exec);

let client: TestClient;

beforeAll(async () => {
    // Start docker-compose services with Galactica devnet configuration
    try {
        const network = 'https://raw.githubusercontent.com/vechain/thor-galactica/refs/heads/main/artifacts/galactica-genesis.json';
        const thorVersion = 'master';
        await execAsync(`NETWORK=${network} THOR_VERSION=${thorVersion} docker-compose up --build -d`);
        // Wait for services to be ready
        await new Promise(resolve => setTimeout(resolve, 5000));
        client = new TestClient();
    } catch (error) {
        console.error('Failed to start docker-compose services:', error);
        throw error;
    }
});

afterAll(async () => {
    try {
        await execAsync('docker-compose down');
    } catch (error) {
        console.error('Failed to stop docker-compose services:', error);
        throw error;
    }
});

export { client };
