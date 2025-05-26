import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';
import { TestClient } from './utils/testClient';

const execAsync = promisify(exec);

type NetworkType = 'galactica_devnet' | 'solo';

const networkConfigs = {
    galactica_devnet: {
        blockchain: 'vechainthor',
        network: 'https://raw.githubusercontent.com/vechain/thor-galactica/refs/heads/main/artifacts/galactica-genesis.json'
    },
    solo: {
        blockchain: 'vechainthor',
        network: 'solo'
    }
};

// Select network configuration based on environment variable
const selectedNetwork = (process.env.TEST_NETWORK || 'galactica_devnet') as NetworkType;
const networkIdentifier = networkConfigs[selectedNetwork];

let client: TestClient;

const waitForBaseFee = async (retries = 100, delay = 1000): Promise<void> => {
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
    try {
        // Start docker compose services with selected network configuration
        await execAsync(`NETWORK=${networkIdentifier.network} MODE=online docker compose up -d`);
        
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

export { client, networkIdentifier };
