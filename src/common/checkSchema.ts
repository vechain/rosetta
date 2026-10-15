import Joi from "joi";

export class CheckSchema {
    public static checkNetworkIdentifier(networkIdentifier:unknown):{result:boolean,error:Joi.ValidationError|undefined}{
        const schema = Joi.object({
            blockchain:Joi.string().valid('vechainthor').required(),
            network:Joi.string().valid('main','test','solo','custom').required(),
            sub_network_identifier:Joi.object({
                network:Joi.string().required()
            })
        }).required();
        const verify = schema.validate(networkIdentifier,{allowUnknown:true});
        return {result:verify.error == undefined,error:verify.error};
    }

    public static checkAccountIdentifier(accountIdentifier:unknown):{result:boolean,error:Joi.ValidationError|undefined}{
        const schema = Joi.object({
            address:Joi.string().lowercase().length(42).regex(/^(-0x|0x)?[0-9a-f]*$/).required(),
            sub_account:Joi.object({
                address:Joi.string().lowercase().length(42).regex(/^(-0x|0x)?[0-9a-f]*$/)
            })
        }).required();
        const verify = schema.validate(accountIdentifier,{allowUnknown:true});
        return {result:verify.error == undefined,error:verify.error};
    }

    public static checkBlockIdentifier(blockIdentifier:unknown):{result:boolean,error:Joi.ValidationError|undefined}{
        const schema = Joi.object({
            index:Joi.number().min(0),
            hash:Joi.string().lowercase().regex(/^(?:-0x|0x)?[0-9a-f]{64}$/)
        });
        const verify = schema.validate(blockIdentifier,{allowUnknown:true});
        return {result:verify.error == undefined,error:verify.error};
    }

    public static checkTransactionIdentifier(transactionIdentifier:unknown):{result:boolean,error:Joi.ValidationError|undefined}{
        const schema = Joi.object({
            hash:Joi.string().lowercase().regex(/^(?:-0x|0x)?[0-9a-f]{64}$/).required()
        }).required();
        const verify = schema.validate(transactionIdentifier,{allowUnknown:true});
        return {result:verify.error == undefined,error:verify.error};
    }

    public static checkSignedTransaction(signedTransaction:unknown):{result:boolean,error:Joi.ValidationError|undefined}{
        const schema = Joi.string().lowercase().regex(/^(-0x|0x)?[0-9a-f]*$/).required()
        const verify = schema.validate(signedTransaction,{allowUnknown:true});
        return {result:verify.error == undefined,error:verify.error};
    }

    public static isAddress(addr:unknown):addr is string {
        const schema = Joi.string().lowercase().length(42).regex(/^(-0x|0x)?[0-9a-f]*$/).required();
        const verify = schema.validate(addr);
        return verify.error == undefined ? true : false;
    }
}