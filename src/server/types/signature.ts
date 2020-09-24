export class SigningPayload {
    public address:string = "";
    public hex_bytes:string = "";
    public readonly signature_type:string = "ecdsa_recovery";
}

export class PulbickKey {
    public hex_bytes:string = "";
    public readonly curve_type:string = "secp256k1"
}

export class Signature {
    public signing_payload:SigningPayload = new SigningPayload();
    public public_key:PulbickKey = new PulbickKey();
    public readonly signature_type:string = "ecdsa_recovery";
    public hex_bytes:string = "";
}