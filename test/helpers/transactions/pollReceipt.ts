import { connex } from "../../constants";

export const pollReceipt = async (
  txID: string,
): Promise<Connex.Thor.Transaction.Receipt> => {
  const { thor } = await connex;

  const tx = thor.transaction(txID);

  let receipt = await tx.getReceipt();

  while (!receipt) {
    await thor.ticker().next();
    receipt = await tx.getReceipt();
  }

  return receipt;
};
