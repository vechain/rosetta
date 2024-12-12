export const Erc20ABI = {
  transfer: {
    name: "transfer",
    type: "function",
    inputs: [
      {
        type: "address",
        name: "_to",
      },
      {
        type: "uint256",
        name: "_value",
      },
    ],
    outputs: [],
  },
};
