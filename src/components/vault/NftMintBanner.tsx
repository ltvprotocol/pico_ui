import { useState, useEffect } from 'react';
import { useVaultContext, useAppContext } from '@/contexts';

export default function NftMintBanner() {
  const {
    hasNft,
    isWhitelistedToMintNft,
    nftTotalSupply
  } = useVaultContext();
  const { address } = useAppContext();

  const [isDismissed, setIsDismissed] = useState(true);

  useEffect(() => {
    if (!address) return;
    const dismissed = localStorage.getItem(`nft_mint_banner_closed_${address.toLowerCase()}`);
    if (dismissed !== 'true') {
      setIsDismissed(false);
    } else {
      setIsDismissed(true);
    }
  }, [address]);

  const handleClose = () => {
    if (!address) return;
    setIsDismissed(true);
    localStorage.setItem(`nft_mint_banner_closed_${address.toLowerCase()}`, 'true');
  };

  const isVisible = !isDismissed && !hasNft && isWhitelistedToMintNft && nftTotalSupply < 1024;

  if (!isVisible) {
    return null;
  }

  return (
    <div className="mb-4 space-y-3 bg-green-50 border border-green-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <svg
          className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
        <div className="flex-1">
          <p className="text-sm text-green-800 font-medium">
            You’re whitelisted to mint 42 NFT!
          </p>
          <p className="text-sm text-green-700 mt-1">
            Mint the 42 NFT to activate your points boost in the LTV Points Program. Earn points faster and get early access to new campaigns and features.
          </p>
        </div>
        <button
          onClick={handleClose}
          className="bg-transparent text-green-500 hover:text-green-700 transition-colors p-1 -mt-1 -mr-1"
          aria-label="Close banner"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <a
        href="https://42.ltv.finance"
        target="_blank"
        rel="noopener noreferrer"
        className="w-full bg-blue-600 hover:bg-blue-700 text-white hover:text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
      >
        Mint NFT
      </a>
      <p className="text-xs text-gray-500 text-center">
        Visit <a className='text-blue-700 hover:underline' target='_blank' href="https://42.ltv.finance">https://42.ltv.finance</a> to mint 42 NFT for points boost & exclusive access
      </p>
    </div>
  );
}
