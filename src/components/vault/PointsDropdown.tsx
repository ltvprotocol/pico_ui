import { useState, useEffect, useMemo } from 'react';
import { useVaultContext, useAppContext } from '@/contexts';
import { fetchUserPoints, fetchIsLiquidityProvider, getUser42Nfts, formatPoints } from '@/utils';

interface UserNft {
  id: string;
  imageUrl: string;
}

export default function PointsDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const { isMainnet, address } = useAppContext();
  const { sharesBalance, pointsRate } = useVaultContext();

  const [userPoints, setUserPoints] = useState<number | null>(null);
  const [isLp, setIsLp] = useState<boolean>(false);
  const [userNfts, setUserNfts] = useState<UserNft[]>([]);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);
  const [isLoadingNfts, setIsLoadingNfts] = useState<boolean>(false);

  // Fetch Points & LP Status
  useEffect(() => {
    if (!isMainnet || !address) {
      setUserPoints(null);
      setIsLp(false);
      return;
    }

    const loadPointsData = async () => {
      setIsLoadingData(true);
      try {
        const [lpStatus, points] = await Promise.all([
          fetchIsLiquidityProvider(address, null),
          fetchUserPoints(address, null)
        ]);

        setIsLp(lpStatus || false);
        setUserPoints(points);
      } catch (error) {
        console.error('Error loading points data:', error);
      } finally {
        setIsLoadingData(false);
      }
    };

    loadPointsData();
  }, [isMainnet, address]);

  // Fetch NFTs
  useEffect(() => {
    if (!isMainnet || !address) {
      setUserNfts([]);
      return;
    }

    const loadNfts = async () => {
      setIsLoadingNfts(true);
      try {
        const nftIds = await getUser42Nfts(address);
        const nfts: UserNft[] = nftIds.map((id) => ({
          id: id,
          imageUrl: `https://42.ltv.finance/images/${id}.png`
        }));
        setUserNfts(nfts);
      } catch (error) {
        console.error('Error loading NFTs:', error);
        setUserNfts([]);
      } finally {
        setIsLoadingNfts(false);
      }
    };

    loadNfts();
  }, [isMainnet, address]);

  // Derived Values
  const hasNft = userNfts.length > 0;
  const boostMultiplier = hasNft ? '1.42x' : '1.0x';
  const boostDescription = hasNft ? '(42% boost with NFTs)' : '(mint 42 NFT for 42% boost)';

  // Base rate calculation
  const baseRate = pointsRate || 0;
  const boostedRate = hasNft ? baseRate * 1.42 : baseRate;
  const yourRate = boostedRate.toFixed(2);

  const dailyEarnings = useMemo(() => {
    if (!sharesBalance || !userPoints) return '0.00';
    const balance = parseFloat(sharesBalance);
    if (isNaN(balance)) return '0.00';
    return (balance * boostedRate).toFixed(2);
  }, [sharesBalance, boostedRate, userPoints]);

  // Display Logic
  const displayedNfts = userNfts.slice(0, 3);
  const remainingCount = userNfts.length - 3;

  return (
    <div className="relative rounded-lg bg-card-bg mb-4 shadow-sm border border-gray-100 bg-white">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-gray-100 flex items-center justify-between p-3 text-left transition-colors rounded-lg focus:outline-none focus:ring-0"
      >
        <span className="text-lg font-medium text-gray-900">Points</span>
        <svg
          className={`w-5 h-5 text-gray-600 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div
        className={`transition-all duration-200 overflow-hidden ${isOpen ? 'max-h-[2000px] opacity-100 p-4 md:p-6' : 'max-h-0 opacity-0 pb-0'
          }`}
      >
        {/* Private LP Section */}
        {isLp && (
          <>
            <div className={`flex flex-col md:flex-row gap-4 ${hasNft ? "md:gap-[99px]" : "md:gap-[128px]"} mb-8`}>
              <div className="min-w-[200px]">
                <div className="text-sm text-gray-500 mb-1">Your Status</div>
                <div className="text-4xl text-gray-900 font-normal">Private LP</div>
              </div>
              <div className="flex-1">
                <div className="text-[0.85rem] text-gray-900 mb-1 font-medium">What is Private LP Status?</div>
                <p className="text-sm text-gray-700 block mb-2">
                  Exclusive status for early depositors earning separate rewards. Deposit more to farm daily points.
                </p>
              </div>
            </div>
            <div className='h-[1px] bg-gray-300 w-full my-6 md:my-8'>{/* Divider */}</div>
          </>
        )}

        {/* What is Points Section */}
        <div className="mb-8">
          <div className="text-[0.85rem] text-gray-900 mb-1 font-medium">What is Points?</div>
          <p className="text-sm text-gray-700 block mb-2">
            LTV Points are rewards for protocol participants. By depositing assets into leveraged vaults, you earn daily points based on your TVL, which will determine future rewards and governance.
          </p>
          <a href="https://leaderboard.ltv.finance" target="_blank" className="text-sm text-indigo-500 transition-colors hover:underline hover:text-indigo-600">
            View leaderboard &rarr;
          </a>
        </div>

        {/* Middle Stats Grid */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row gap-8 md:gap-[123px] mb-6">
            <div className="min-w-[176px]">
              <div className="text-sm text-gray-500 mb-1">Your Points</div>
              <div className="text-[2.5rem] font-normal text-gray-900 mb-0.5 leading-none">
                {!isLoadingData && (
                  userPoints !== null ? formatPoints(userPoints) : '0.00'
                )}
              </div>
              <div className="text-[0.95rem] text-gray-500 mb-4">
                <span className="text-[0.85rem] text-gray-900 font-normal mr-1">Daily Earnings:</span>
                {dailyEarnings}
              </div>
            </div>

            {/* Rank/NFT Card */}
            <div className="hidden md:flex bg-gray-50 rounded-xl items-center gap-4 w-full p-0 bg-transparent">
              {!isLoadingNfts && (
                !hasNft ? (
                  // No NFT State
                  <div className="flex flex-col items-start gap-3 pl-8">
                    <div className="text-sm text-gray-700">
                      <div className="mb-2"><strong>Mint 42 NFT</strong> to unlock your permanent 42% boost and early access to future leveraged vaults.</div>
                    </div>
                    <a href="https://42.ltv.finance" target='_blank' rel='noreferrer' className="block w-full sm:w-fit text-white bg-indigo-500 hover:bg-indigo-400 hover:text-white transition-all rounded-[10px] px-10 py-2.5 font-semibold text-base">
                      Mint Now
                    </a>
                  </div>
                ) : (
                  // Has NFT(s) State
                  <>
                    <div className={`flex ${userNfts.length > 1 ? '-space-x-12' : ''}`}>
                      {displayedNfts.map((nft, index) => {
                        const isLast = index === displayedNfts.length - 1;
                        return (
                          <div
                            key={nft.id}
                            className="w-20 h-20 min-w-[5rem] rounded-lg flex justify-center items-center text-white font-semibold text-2xl border-2 border-white shadow-sm relative"
                            style={{
                              backgroundColor: index === 0 ? '#136f00' : index === 1 ? '#1f2937' : '#374151',
                              backgroundImage: `url(${nft.imageUrl})`,
                              backgroundSize: 'cover',
                              zIndex: index + 1
                            }}
                          >
                            {!nft.imageUrl.includes('http') && '42'}
                            {isLast && remainingCount > 0 && (
                              <div className="absolute bottom-1 right-2 text-white text-sm font-bold">
                                +{remainingCount}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="mb-1">
                      <div className="flex gap-1 text-[0.85rem] mb-1">
                        <div className='text-gray-900 font-medium'>{userNfts.length > 1 ? 'Your NFTs:' : 'Your NFT'}</div>
                        <div className='text-gray-800 font-normal'>{displayedNfts.map(nft => <span key={nft.id}> #{nft.id}</span>)}</div>
                        <div className='text-gray-700 font-light'>{remainingCount > 0 && <span> and {remainingCount} more</span>}</div>
                      </div>
                      <div className='text-sm text-gray-700 font-normal'>
                        This {userNfts.length > 1 ? 'NFTs grants' : 'NFT grants'} you a permanent 42% points boost and early access to all future leveraged vaults.
                      </div>
                    </div>
                  </>
                )
              )}
            </div>
          </div>
          {/* Rate Info */}
          <div className="flex flex-col md:flex-row md:items-end gap-8 md:gap-[55px]">
            <div>
              <div className="text-[0.95rem] text-gray-500">
                <span className="text-gray-900 font-medium mr-1">Rate:</span> {yourRate} <span className='text-gray-600'>per 1 token / day</span>
              </div>
              <div className="text-[0.95rem] text-gray-500">
                <span className="text-gray-900 font-medium mr-1">Boost:</span> {boostMultiplier} <span className='text-gray-600'>{boostDescription}</span>
              </div>
            </div>
            <div className="flex-1">
              <div className="text-[0.85rem] text-gray-900 mb-1 font-medium">What is Points Boost?</div>
              <p className="text-sm text-gray-700 block">
                The Points Boost is a permanent 1.42x multiplier applied to your daily earnings. This exclusive benefit is unlocked by holding the 42 NFT, ensuring you accumulate points 42% faster than standard users.
              </p>
            </div>
          </div>
          {/* Rank/NFT Card Mobile */}
          <div className="md:hidden bg-gray-50 rounded-xl flex flex-col sm:flex-row sm:items-center gap-4 w-full p-0 bg-transparent mt-8">
            {!isLoadingNfts && (
              !hasNft ? (
                // No NFT State
                <div className="flex flex-col items-start gap-3">
                  <div className="text-sm text-gray-500 leading-[1.4]">
                    <div className="mb-2"><strong>Mint 42 NFT</strong> to unlock your permanent 42% boost and early access to future leveraged vaults.</div>
                  </div>
                  <a href="https://42.ltv.finance" target='_blank' rel='noreferrer' className="text-white bg-indigo-500 hover:bg-indigo-400 hover:text-white transition-all rounded-[10px] px-10 py-2.5 font-semibold text-base">
                    Mint Now
                  </a>
                </div>
              ) : (
                // Has NFT(s) State
                <>
                  <div className={`flex ${userNfts.length > 1 ? '-space-x-12' : ''}`}>
                    {displayedNfts.map((nft, index) => {
                      const isLast = index === displayedNfts.length - 1;
                      return (
                        <div
                          key={nft.id}
                          className="w-20 h-20 min-w-[5rem] rounded-lg flex justify-center items-center text-white font-semibold text-2xl border-2 border-white shadow-sm relative"
                          style={{
                            backgroundColor: index === 0 ? '#136f00' : index === 1 ? '#1f2937' : '#374151',
                            backgroundImage: `url(${nft.imageUrl})`,
                            backgroundSize: 'cover',
                            zIndex: index + 1
                          }}
                        >
                          {!nft.imageUrl.includes('http') && '42'}
                          {isLast && remainingCount > 0 && (
                            <div className="absolute bottom-1 right-2 text-white text-sm font-bold">
                              +{remainingCount}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className='mb-1'>
                    <div className="flex gap-1 text-[0.85rem] mb-1">
                      <div className='text-gray-900 font-medium'>{userNfts.length > 1 ? 'Your NFTs:' : 'Your NFT'}</div>
                      <div className='text-gray-800 font-normal'>{displayedNfts.map(nft => <span key={nft.id}> #{nft.id}</span>)}</div>
                      <div className='text-gray-700 font-light'>{remainingCount > 0 && <span> and {remainingCount} more</span>}</div>
                    </div>
                    <div className='text-sm text-gray-700 font-normal'>
                      This {userNfts.length > 1 ? 'NFTs grants' : 'NFT grants'} you a permanent 42% points boost and early access to all future leveraged vaults.
                    </div>
                  </div>
                </>
              )
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
