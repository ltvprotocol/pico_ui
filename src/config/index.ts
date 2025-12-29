import { MAINNET_CHAIN_ID_STRING, SEPOLIA_CHAIN_ID_STRING } from '@/constants';

export const POINTS_API_URLS: Record<string, string> = {
  [SEPOLIA_CHAIN_ID_STRING]: "https://api-points.ltv.finance",
  [MAINNET_CHAIN_ID_STRING]: "https://api-points.ltv.finance"
};

export const APY_API_URLS: Record<string, string> = {
  [SEPOLIA_CHAIN_ID_STRING]: "https://api-apy.ltv.finance",
  [MAINNET_CHAIN_ID_STRING]: "https://api-apy.ltv.finance"
};

export const TERMS_API_URLS: Record<string, string> = {
  [SEPOLIA_CHAIN_ID_STRING]: "https://api-terms-of-use.ltv.finance",
  [MAINNET_CHAIN_ID_STRING]: "https://api-terms-of-use.ltv.finance"
};
