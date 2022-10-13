import Joi from "joi";

export class CheckSchema {
    public static checkNetworkIdentifier(networkIdentifier:any):{result:boolean,error:any}{
        const schema = Joi.object({
            blockchain:Joi.string().valid('vechainthor').required(),
            network:Joi.string().valid('main','test','custom').required(),
            sub_network_identifier:Joi.object({
                network:Joi.string().required()
            })
        }).required();
        const verify = schema.validate(networkIdentifier,{allowUnknown:true});
        return {result:verify.error == undefined,error:verify.error};
    }

    public static checkAccountIdentifier(accountIdentifier:any):{result:boolean,error:any}{
        const schema = Joi.object({
            address:Joi.string().lowercase().length(42).regex(/^(-0x|0x)?[0-9a-f]*$/).required(),
            sub_account:Joi.object({
                address:Joi.string().lowercase().length(42).regex(/^(-0x|0x)?[0-9a-f]*$/)
            })
        });
        const verify = schema.validate(accountIdentifier,{allowUnknown:true});
        return {result:verify.error == undefined,error:verify.error};
    }

    public static checkBlockIdentifier(blockIdentifier:any):{result:boolean,error:any}{
        const schema = Joi.object({
            index:Joi.number().min(0),
            hash:Joi.string().length(66).regex(/^(-0x|0x)?[0-9a-f]*$/)
        }).oxor('index','hash');
        const verify = schema.validate(blockIdentifier,{allowUnknown:true});
        return {result:verify.error == undefined,error:verify.error};
    }

    public static checkTransactionIdentifier(transactionIdentifier:any):{result:boolean,error:any}{
        const schema = Joi.object({
            hash:Joi.string().lowercase().length(66).regex(/^(-0x|0x)?[0-9a-f]*$/).required()
        });
        const verify = schema.validate(transactionIdentifier,{allowUnknown:true});
        return {result:verify.error == undefined,error:verify.error};
    }

    public static checkSignedTransaction(signedTransaction:any):{result:boolean,error:any}{
        const schema = Joi.string().lowercase().regex(/^(-0x|0x)?[0-9a-f]*$/).required()
        const verify = schema.validate(signedTransaction,{allowUnknown:true});
        return {result:verify.error == undefined,error:verify.error};
    }
}