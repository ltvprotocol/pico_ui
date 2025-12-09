export const formatTokenSymbol = (symbol: string | null | undefined): string => {
  if (!symbol) return '';
  if (symbol === 'WETH') {
    return 'ETH (WETH)';
  }
  return symbol;
};
