import { ec as EC } from 'elliptic'
const curve = new EC('secp256k1')

export default class Secp256k1Ex{
    public static toUncompress(compresspubkey:Buffer):Buffer{
        return Buffer.from(curve.keyFromPublic(compresspubkey).getPublic('array'));
    }
}
