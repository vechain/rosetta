import { HDNode, secp256k1 } from "thor-devkit";
import ConnexPro from "../src/utils/connexPro";
import { inject } from "vitest";
import { Wallet } from "@vechain/connex-driver";

const networkIdentifier = {
  blockchain: "vechainthor",
  network: "custom",
};

const hdNode = HDNode.fromMnemonic(
  "denial kitchen pet squirrel other broom bar gas better priority spoil cross".split(
    " ",
  ),
);

const accounts: { address: string; privateKey: Buffer }[] = [];

for (let i = 0; i < 10; i++) {
  const node = hdNode.derive(i);
  accounts.push({
    address: node.address,
    privateKey: node.privateKey!,
  });
}

const wallet: Wallet = {
  list: accounts.map((account) => {
    return {
      address: account.address,
      sign(msgHash: Buffer): Promise<Buffer> {
        return Promise.resolve(secp256k1.sign(msgHash, account.privateKey));
      },
    };
  }),
};

const connex = ConnexPro.instance(inject("thorURL"), wallet);
const vthoAddress = "0x0000000000000000000000000000456E65726779".toLowerCase();

export { accounts, networkIdentifier, hdNode, connex, vthoAddress };
