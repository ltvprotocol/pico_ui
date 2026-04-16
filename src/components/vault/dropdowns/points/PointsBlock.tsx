import { useState, useEffect, useMemo } from 'react';
import { useVaultContext, useAppContext } from '@/contexts';
import { fetchUserPoints, formatPoints } from '@/utils';
import { DescriptionBlock, LabeledValue } from '@/components/ui';
import { NftBlock } from './NftBlock';
import { InfoRow } from './InfoRow';

const POINTS_TITLE = "What is Points?";
const POINTS_DESCRIPTION = "LTV Points are rewards for protocol participants. By depositing assets into leveraged vaults, you earn daily points based on your TVL, which will determine future rewards and governance.";

const BOOST_TITLE = "What is Points Boost?";
const BOOST_DESCRIPTION = "The Points Boost is a permanent 1.42x multiplier applied to your daily earnings. This exclusive benefit is unlocked by holding the 42 NFT, ensuring you accumulate points 42% faster than standard users.";

export function PointsBlock() {
  const { isMainnet, address } = useAppContext();
  const { sharesBalance, pointsRate, hasNft } = useVaultContext();

  const [userPoints, setUserPoints] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isMainnet || !address) {
      setUserPoints(null);
      return;
    }

    const loadPointsData = async () => {
      setIsLoading(true);
      try {
        const points = await fetchUserPoints(address, null);
        setUserPoints(points);
      } catch (error) {
        console.error('Error loading points data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPointsData();
  }, [isMainnet, address]);

  // Derived Values
  const boostMultiplier = hasNft ? '1.42x' : '1.0x';
  const boostDescription = hasNft ? '(42% boost with NFTs)' : '(mint 42 NFT for 42% boost)';

  const baseRate = pointsRate || 0;
  const nftBoostMultiplier = 1.42;

  const boostedRate =
    hasNft
      ? baseRate * nftBoostMultiplier
      : baseRate;

  const yourRate = boostedRate.toFixed(2);

  // We depend on userPoints here to ensure we don't show earnings before we've confirmed the user has valid points data.
  // However, this delays showing earnings after a fresh deposit until points are updated/fetched.
  // @todo: Implement backend support to calculate/return daily earnings immediately after deposit,
  // independent of the periodic points update cycle, so we can remove the userPoints dependency here.
  const dailyEarnings = useMemo(() => {
    if (!sharesBalance || !userPoints) return '0.00';
    const balance = parseFloat(sharesBalance);
    if (isNaN(balance)) return '0.00';
    return (balance * boostedRate).toFixed(2);
  }, [sharesBalance, boostedRate, userPoints]);

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <DescriptionBlock title={POINTS_TITLE}>
        {POINTS_DESCRIPTION}
        <a
          href="https://leaderboard.ltv.finance"
          target="_blank"
          className="
            block mt-2 text-sm text-indigo-500 transition-colors w-fit
            hover:underline hover:text-indigo-600
          "
        >
          View leaderboard &rarr;
        </a>
      </DescriptionBlock>

      <div className="flex flex-col gap-6 md:gap-8">
        <div className="flex flex-col md:flex-row gap-8 md:gap-16">
          <LabeledValue
            label="Your Points"
            value={
              isLoading ?
                "Loading..." :
                (userPoints !== null ? formatPoints(userPoints) : '0.00')
            }
            subtitle={
              <div className='w-fit'>
                {isLoading ?
                  "Loading..." :
                  <>
                    <span className="text-[0.85rem] text-gray-900 font-normal mr-1">
                      Daily Earnings:
                    </span>
                    {dailyEarnings}
                  </>
                }
              </div>
            }
            className="min-w-[273.51px] mb-4"
          />

          <NftBlock className="hidden md:flex" />
        </div>

        <div className="flex flex-col md:flex-row md:items-end gap-8 md:gap-16">
          <div className="min-w-[273.51px]">
            <InfoRow
              label="Rate"
              value={yourRate}
              suffix="per 1 token / day"
            />
            <InfoRow
              label="Boost"
              value={boostMultiplier}
              suffix={boostDescription}
            />
          </div>
          <DescriptionBlock
            title={BOOST_TITLE}
            className="flex-1"
          >
            {BOOST_DESCRIPTION}
          </DescriptionBlock>
        </div>
        <NftBlock className="md:hidden" />
      </div>
    </div>
  );
}
