import { MAINNET_CHAIN_ID_STRING, SEPOLIA_CHAIN_ID_STRING } from '@/constants';

export const API_URLS: Record<string, string> = {
  [SEPOLIA_CHAIN_ID_STRING]: "https://api-testnet.ltv.finance",
  [MAINNET_CHAIN_ID_STRING]: "https://api-testnet.ltv.finance"
};

export const TERMS_API_URLS: Record<string, string> = {
  [SEPOLIA_CHAIN_ID_STRING]: "https://api-terms-of-use.ltv.finance",
  [MAINNET_CHAIN_ID_STRING]: "https://api-terms-of-use.ltv.finance"
};
