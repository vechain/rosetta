import { abi } from "thor-devkit";

const balanceOf: abi.Function.Definition = {
  stateMutability: "view",
  name: "balanceOf",
  type: "function",
  inputs: [
    {
      type: "address",
      name: "_owner",
    },
  ],
  outputs: [
    {
      type: "uint256",
      name: "balance",
    },
  ],
};

const transfer: abi.Function.Definition = {
  stateMutability: "nonpayable",
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
};

export const Erc20ABI = {
  transfer,
  balanceOf,
};
