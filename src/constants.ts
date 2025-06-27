export const VAULT_ADDRESS = '0xe2a7f267124ac3e4131f27b9159c78c521a44f3c';
export const BORROW_TOKEN_ADDRESS = '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14';
export const COLLATERAL_TOKEN_ADDRESS = '0x8f7b2044F9aA6fbf495c1cC3bDE120dF9032aE43';

export const WETH_ADDRESS = '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14';

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