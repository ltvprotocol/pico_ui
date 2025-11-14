const TOKEN_TO_COINGECKO_ID: Record<string, string> = {
  'WETH': 'ethereum',
  'ETH': 'ethereum',
  'USDC': 'usd-coin',
  'USDT': 'tether',
  'DAI': 'dai',
  'WBTC': 'wrapped-bitcoin',
  'BTC': 'wrapped-bitcoin',
  'LINK': 'chainlink',
  'UNI': 'uniswap',
  'AAVE': 'aave',
  'MKR': 'maker',
  'SNX': 'havven',
  'COMP': 'compound-governance-token',
  'CRV': 'curve-dao-token',
  'YFI': 'yearn-finance',
  'SUSHI': 'sushi',
  '1INCH': '1inch',
  'BAL': 'balancer',
  'BAT': 'basic-attention-token',
  'ZRX': '0x',
  'ENJ': 'enjincoin',
  'MANA': 'decentraland',
  'SAND': 'the-sandbox',
  'MATIC': 'matic-network',
  'POL': 'matic-network',
  'ARB': 'arbitrum',
  'OP': 'optimism',
  'STETH': 'staked-ether',
  'RETH': 'rocket-pool-eth',
  'CBETH': 'coinbase-wrapped-staked-eth',
  'WSTETH': 'wrapped-steth',
};

export async function fetchTokenPrice(tokenSymbol: string | null): Promise<number | null> {
  if (!tokenSymbol) {
    return null;
  }

  const coingeckoId = TOKEN_TO_COINGECKO_ID[tokenSymbol.toUpperCase()];
  if (!coingeckoId) {
    console.warn(`Token symbol "${tokenSymbol}" not found in CoinGecko mapping`);
    return null;
  }

  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoId}&vs_currencies=usd`
    );
    
    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();
    const price = data[coingeckoId]?.usd;
    
    if (typeof price !== 'number') {
      console.warn(`Price not found for token ${tokenSymbol} (CoinGecko ID: ${coingeckoId})`);
      return null;
    }

    return price;
  } catch (err) {
    console.error(`Error fetching price for ${tokenSymbol}:`, err);
    return null;
  }
}
