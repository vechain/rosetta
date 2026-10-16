import { ethers } from 'ethers';

// Endpoints of the environment started by globalSetup (docker compose).
export const ROSETTA_URL = process.env.ROSETTA_URL ?? 'http://127.0.0.1:8080';
export const THOR_URL = process.env.THOR_URL ?? 'http://127.0.0.1:8669';

// The Rosetta server runs thor solo internally. Solo's chain tag is not
// main/test, so Rosetta reports the network as "custom".
export const networkIdentifier = {
    blockchain: 'vechainthor',
    network: 'custom'
};

export const VTHO_CONTRACT_ADDRESS = '0x0000000000000000000000000000456e65726779';

export const VET = {
    symbol: 'VET',
    decimals: 18
};

export const VTHO = {
    symbol: 'VTHO',
    decimals: 18,
    metadata: {
        contractAddress: VTHO_CONTRACT_ADDRESS
    }
};

export interface SoloAccount {
    address: string,
    privateKey: string,
    /** Compressed secp256k1 public key, hex without 0x prefix. */
    publicKey: string
}

const soloAccount = (privateKey: string): SoloAccount => {
    const key = new ethers.SigningKey('0x' + privateKey);
    return {
        address: ethers.computeAddress(key.publicKey).toLowerCase(),
        privateKey,
        publicKey: key.compressedPublicKey.slice(2)
    };
};

// Pre-funded thor solo dev accounts (see thor/genesis/devnet.go).
export const SOLO_ACCOUNTS = [
    '99f0500549792796c14fed62011a51081dc5b5e68fe8bd8a13b86be829c4fd36',
    '7b067f53d350f1cf20ec13df416b7b73e88a1dc7331bc904b92108b1e76a08b1',
    'f4a1a17039216f535d42ec23732c79943ffb45a089fbb78a14daad0dae93e991',
    '35b5cc144faca7d7f220fca7ad3420090861d5231d80eb23e1013426847371c4'
].map(soloAccount);

/** A fresh address with no history, so its balance changes come only from the test. */
export const randomAddress = (): string => ethers.Wallet.createRandom().address.toLowerCase();
