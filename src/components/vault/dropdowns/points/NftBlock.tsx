import { useState, useEffect } from 'react';
import { useVaultContext, useAppContext } from '@/contexts';
import { getUser42Nfts } from '@/utils';

interface UserNft {
  id: string;
  imageUrl: string;
}

interface NftBlockProps {
  className?: string;
}

export function NftBlock({ className }: NftBlockProps) {
  const { isMainnet, address } = useAppContext();
  const { hasNft } = useVaultContext();

  const [userNfts, setUserNfts] = useState<UserNft[]>([]);
  const [isLoadingNfts, setIsLoadingNfts] = useState<boolean>(false);

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
      } catch (err) {
        console.error('Error loading NFTs:', err);
        setUserNfts([]);
      } finally {
        setIsLoadingNfts(false);
      }
    };

    loadNfts();
  }, [isMainnet, address]);

  const hasNftIds = userNfts.length > 0;
  const displayedNfts = userNfts.slice(0, 3);
  const remainingCount = userNfts.length - 3;

  if (isLoadingNfts) {
    return (
      <div className={`flex flex-col md:flex-row md:items-center gap-4 ${className || ''}`}>
        <div className="w-20 h-20 min-w-[5rem] rounded-lg bg-gray-200 animate-pulse border-2 border-gray-100/50" />
        <div className="mb-1 flex-1">
          <div className="h-4 bg-gray-200 rounded w-24 mb-2 animate-pulse" />
          <div className="h-3 bg-gray-200 rounded w-full mb-1 animate-pulse" />
          <div className="h-3 bg-gray-200 rounded w-3/4 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!hasNft) {
    return (
      <div className={`flex flex-col items-start gap-4 ${className || ''}`}>
        <div className="text-sm text-gray-500 md:text-gray-700 leading-[1.4]">
          <strong>Mint 42 NFT</strong> to unlock your permanent 42% boost and early access to future leveraged vaults.
        </div>
        <a href="https://42.ltv.finance" target='_blank' rel='noreferrer' className="text-white bg-indigo-500 hover:bg-indigo-400 hover:text-white transition-all rounded-[10px] px-10 py-2.5 font-semibold text-base">
          Mint Now
        </a>
      </div>
    );
  }

  if (hasNftIds) {
    return (
      <div className={`flex flex-col md:flex-row md:items-center gap-4 ${className || ''}`}>
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
            {userNfts.length > 1 ? 'These NFTs grant' : 'This NFT grants'} you a permanent 42% points boost and early access to all future leveraged vaults.
          </div>
        </div>
      </div>
    );
  }

  // Fallback display (if failed to load ids)
  return (
    <div className={`flex flex-col md:flex-row md:items-center gap-4 ${className || ''}`}>
      <div className="w-20 h-20 min-w-[5rem] rounded-lg flex justify-center items-center text-white font-semibold text-2xl border-2 border-white shadow-sm bg-black">
        42
      </div>

      <div className="mb-1">
        <div className="text-[0.85rem] mb-1">
          <div className='text-gray-900 font-medium'>You have 42 NFT</div>
        </div>
        <div className='text-sm text-gray-700 font-normal'>
          This NFT grants you a permanent 42% points boost and early access to all future leveraged vaults.
        </div>
      </div>
    </div>
  );
}
