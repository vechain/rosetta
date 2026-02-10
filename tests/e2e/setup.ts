import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { TestClient } from './utils/testClient';

const execAsync = promisify(exec);

type NetworkType = 'solo'; // To be extended if more networks are added

const networkConfigs = {
    solo: {
        blockchain: 'vechainthor',
        network: 'solo'
    }
};

// Select network configuration based on environment variable
const selectedNetwork = (process.env.TEST_NETWORK ?? 'solo') as NetworkType;
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
        console.log('\n' + '='.repeat(80));
        console.log('  🚀 Rosetta E2E Test Setup');
        console.log('='.repeat(80));

        // Clean up any existing services and volumes for this project only
        console.log('  🧹 Cleaning up existing services...');
        await execAsync('docker compose down -v').catch(() => {});

        // Clean the data directory with safety checks
        const projectRoot = resolve(__dirname, '../..');
        const dataDir = resolve(projectRoot, 'rosetta_data');

        // Safety check: only clean if directory exists and is within project
        if (existsSync(dataDir) && dataDir.startsWith(projectRoot)) {
            console.log('  🗑️  Cleaning data directory...');
            await execAsync(`rm -rf "${dataDir}"/*`).catch(() => {});
        }

        // Start docker compose services with selected network configuration
        console.log(`  🐳 Starting Docker services (network: ${networkIdentifier.network})...`);
        await execAsync(`NETWORK=${networkIdentifier.network} MODE=online docker compose up -d`);

        // Wait for services to be ready and baseFee to be available
        console.log('  ⏳ Waiting for services to be ready...');
        await Promise.all([
            waitForBaseFee(),
            new Promise(resolve => setTimeout(resolve, 5000))
        ]);

        console.log('  ✅ Services ready\n');

        // Show Docker logs for context (before tests run)
        console.log('='.repeat(80));
        console.log('  📋 Docker Container Logs (for context)');
        console.log('='.repeat(80));
        const { stdout, stderr } = await execAsync('docker compose logs --tail=50');
        console.log(stdout);

        // Show stderr if present (including env var warnings - useful for debugging)
        if (stderr.trim()) {
            console.log('\n' + '─'.repeat(80));
            console.log('  📄 STDERR (warnings/errors from docker compose command):');
            console.log('─'.repeat(80));
            console.warn(stderr);
        }

        console.log('='.repeat(80));
        console.log('  🧪 Running Tests...');
        console.log('='.repeat(80) + '\n');

        client = new TestClient();
    } catch (error) {
        console.error('\n❌ Failed to start docker compose services:', error);
        // Show logs on setup failure
        try {
            const { stdout, stderr } = await execAsync('docker compose logs');
            console.log('\n📋 Docker logs:\n', stdout);
            if (stderr) {
                console.warn('\n⚠️  Docker stderr:\n', stderr);
            }
        } catch {}
        throw error;
    }
});

afterAll(async () => {
    try {
        console.log('\n' + '='.repeat(80));
        console.log('  🧹 Cleaning up Docker services...');
        console.log('='.repeat(80) + '\n');
        await execAsync('docker compose down -v');
    } catch (error) {
        console.error('❌ Failed to stop docker compose services:', error);
        throw error;
    }
});

export { client, networkIdentifier };
