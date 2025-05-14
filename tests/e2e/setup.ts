import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';
import { TestClient } from './utils/testClient';

const execAsync = promisify(exec);

let client: TestClient;

const waitForBaseFee = async (retries = 30, delay = 1000): Promise<void> => {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await axios.get('http://127.0.0.1:8669/blocks/best');
            if (response.data.baseFeePerGas !== undefined) {
                return;
            }
        } catch (error) {
            // Continue with next attempt
        }
        await new Promise(resolve => setTimeout(resolve, delay));
    }
    throw new Error('Could not get baseFeePerGas after multiple attempts');
};

beforeAll(async () => {
    // Start docker compose services with Galactica devnet configuration
    try {
        const network = 'https://raw.githubusercontent.com/vechain/thor-galactica/refs/heads/main/artifacts/galactica-genesis.json';
        const thorVersion = 'master';
        // Using docker compose instead of docker-compose, change back if needed
        await execAsync(`NETWORK=${network} THOR_VERSION=${thorVersion} docker compose up -d`);
        
        // Wait for services to be ready and baseFee to be available
        await Promise.all([
            waitForBaseFee(),
            new Promise(resolve => setTimeout(resolve, 5000))
        ]);
        
        client = new TestClient();
    } catch (error) {
        console.error('Failed to start docker compose services:', error);
        throw error;
    }
});

afterAll(async () => {
    try {
        await execAsync('docker compose down');
    } catch (error) {
        console.error('Failed to stop docker compose services:', error);
        throw error;
    }
});

export { client };
