import { parseEther } from "ethers";

export const WETH_ADDRESS = '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14';

const WETH_ADDRESSES = [
  '0x2d5ee574e710219a521449679a4a7f2b43f046ad',
  '0xc558dbdd856501fcd9aaf1e62eae57a9f0629a3c',
  '0xfff9976782d46cc05630d1f6ebab18b2324d6b14'
];

export const isWETHAddress = (address: string): boolean => {
  const lowerAddress = address.toLowerCase().trim();
  const result = WETH_ADDRESSES.includes(lowerAddress);
  return result;
};

export const CONNECTOR_ADDRESSES = {
  MORPHO: '0x2F7E5B3f16120363E9d6C6a46744D3a90D426CB0',
  AAVE: '0x87e1d99D8Af73a7DB9d80827076A283E17a1f431',
  GHOST: '0x899645f1AF07511e112f737027BCF13F122aa5A6'
};

// TODO: Get the correct market ID from config or contract
export const MORPHO_MARKET_ID = '0xffd695adfd08031184633c49ce9296a58ddbddd0d5fed1e65fbe83a0ba43a5dd';

// Gas reserve in ETH (0.002 ETH = 2,000,000,000,000,000 wei)
export const GAS_RESERVE_ETH = 0.002;
export const GAS_RESERVE_ETH_STR = "0.002";
export const GAS_RESERVE_WEI = parseEther(GAS_RESERVE_ETH_STR);

export const SEPOLIA_CHAIN_ID = 11155111n;
export const SEPOLIA_CHAIN_ID_HEX = '0xaa36a7'; // 11155111 in hex
export const SEPOLIA_CHAIN_ID_STRING = "11155111";

export const SEPOLIA_NETWORK = {
  chainId: SEPOLIA_CHAIN_ID_HEX,
  chainName: 'Sepolia',
  nativeCurrency: {
    name: 'SepoliaETH',
    symbol: 'SEP',
    decimals: 18
  },
  rpcUrls: ['https://ethereum-sepolia-rpc.publicnode.com'],
  blockExplorerUrls: ['https://sepolia.etherscan.io']
};