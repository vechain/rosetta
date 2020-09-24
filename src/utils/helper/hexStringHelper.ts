export class HexStringHelper
{
    public static ConvertToBuffer(value:string):Buffer{
        var hexString = value.toLowerCase();
        if(hexString.substring(0,2) === "0x"){
            hexString = hexString.substring(2);
        }
        return Buffer.from(hexString,'hex');
    }
}