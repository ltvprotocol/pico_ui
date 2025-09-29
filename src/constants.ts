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

export const SEPOLIA_CHAIN_ID = 11155111n;
export const SEPOLIA_CHAIN_ID_HEX = '0xaa36a7'; // 11155111 in hex

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