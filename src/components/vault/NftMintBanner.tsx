import { useVaultContext } from '@/contexts';

export default function NftMintBanner() {
  const {
    hasNft,
    isWhitelistedToMintNft,
    nftTotalSupply
  } = useVaultContext();

  const isVisible = !hasNft && isWhitelistedToMintNft && nftTotalSupply < 1024;

  if (!isVisible) {
    return null;
  }

  return (
    <div className="mb-4 space-y-3">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
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
        </div>
      </div>
      <a
        href="https://42.ltv.finance"
        target="_blank"
        rel="noopener noreferrer"
        className="w-full bg-blue-600 hover:bg-blue-700 text-white hover:text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
      >
        Mint NFT
      </a>
    </div>
  );
}
