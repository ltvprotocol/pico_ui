import { JsonRpcProvider, formatUnits } from "ethers";
import { CHAINLINK_PRICE_FEEDS } from "@/constants";
import { ChainlinkPriceFeed__factory } from "@/typechain-types";

export const getAssetPrice = async (
  symbol: string,
  networkId: string,
  provider: JsonRpcProvider
): Promise<number | null> => {
  try {
    const feedsForNetwork = CHAINLINK_PRICE_FEEDS[networkId];
    if (!feedsForNetwork) return null;

    const feedAddress = feedsForNetwork[symbol.toUpperCase()];
    if (!feedAddress) return null;

    const feedContract = ChainlinkPriceFeed__factory.connect(feedAddress, provider);

    const [latestAnswer, decimals] = await Promise.all([
      feedContract.latestAnswer(),
      feedContract.decimals()
    ]);

    return parseFloat(formatUnits(latestAnswer, decimals));
  } catch (err) {
    console.error(`Error retrieving price for ${symbol} from Chainlink:`, err);
    return null;
  }
};
