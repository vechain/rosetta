export type Signature = {
    signing_payload:SigningPayload,
    public_key:PublicKey,
    signature_type:SignatureType,
    hex_bytes:string,
}

export type SigningPayload = {
    address?:string,
    hex_bytes:string,
    signature_type?:SignatureType
}

export type PublicKey = {
    hex_bytes:string,
    curve_type:CurveType
}

export enum SignatureType {
    ecdsa = 'ecdsa',
    ecdsa_recovery = 'ecdsa_recovery',
    ed25519 = 'ed25519',
    schnorr_1 = 'schnorr_1',
    schnorr_poseidon = 'schnorr_poseidon'
}

export enum CurveType {
    secp256k1 = 'secp256k1',
    secp256r1 = 'secp256r1',
    edwards25519 = 'edwards25519',
    tweedle = 'tweedle',
    pallas = 'pallas'
}