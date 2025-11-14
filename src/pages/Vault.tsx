import { useLocation, useParams } from 'react-router-dom';
import { VaultContextProvider, useVaultContext } from "@/contexts";
import { useAppContext } from "@/contexts";
import UnrecognizedNetwork from "@/components/vault/UnrecognizedNetwork";
import MoreInfo from "@/components/vault/MoreInfo";
import Actions from "@/components/vault/Actions";
import VaultHeader from '@/components/vault/VaultHeader';
import Info from '@/components/vault/Info';
import LowLevelRebalance from '@/components/vault/LowLevelRebalance';
import FlashLoanHelper from '@/components/vault/FlashLoanHelper';
import Auction from '@/components/vault/Auction';
import VaultNotFound from '@/components/vault/VaultNotFound';
import WhitelistBanner from '@/components/vault/WhitelistBanner';

function VaultContent() {
  const { 
    vaultExists, vaultConfig,
    isWhitelistActivated, isWhitelisted,
    flashLoanMintHelperAddress, flashLoanRedeemHelperAddress
  } = useVaultContext();

  const { unrecognizedNetworkParam, isTermsSigned } = useAppContext();

  const hasFlashLoanHelper =
    (flashLoanMintHelperAddress && flashLoanMintHelperAddress !== '') ||
    (flashLoanRedeemHelperAddress && flashLoanRedeemHelperAddress !== '');

  if (unrecognizedNetworkParam) {
    return <UnrecognizedNetwork />;
  }

  if (vaultExists === false) {
    return <VaultNotFound />;
  }

  // Only disable UI when we confirmed user is NOT whitelisted (don't disable while checking)
  const isWhitelistDisabled = isWhitelistActivated === true && isWhitelisted === false;
  // Also disable UI when terms are not signed (only when we confirmed they're not signed, not while checking)
  const isTermsDisabled = isTermsSigned === false;
  const isUIDisabled = isWhitelistDisabled || isTermsDisabled;

  return (
    <>
      <VaultHeader />
      <WhitelistBanner />
      <div className={isUIDisabled ? 'opacity-50 pointer-events-none' : ''}>
        <div className="flex flex-col [@media(min-width:768px)]:flex-row gap-4 mb-4">
          <div className="flex-1">
            <Info />
          </div>
          <div className="flex-1">
            <Actions isSafe={vaultConfig && (vaultConfig as any).useSafeActions} />
          </div>
        </div>
        <div className="mb-4">
          <LowLevelRebalance />
        </div>
        {hasFlashLoanHelper && (
          <div className="mb-4">
            <FlashLoanHelper />
          </div>
        )}
        <div className="mb-4">
          <Auction />
        </div>
        <MoreInfo />
      </div>
    </>
  );
}

export default function Vault() {
  const { vaultAddress } = useParams<{ vaultAddress: string }>();
  const location = useLocation();
  const state = location.state || {};

  if (!vaultAddress) return null;

  const params = {
    collateralTokenSymbol: state.collateralTokenSymbol || null,
    borrowTokenSymbol: state.borrowTokenSymbol || null,
    maxLeverage: state.maxLeverage || null,
    lendingName: state.lendingName || null,
    apy: state.apy || null,
    pointsRate: state.pointsRate || null,
    isWhitelistActivated: state.isWhitelistActivated ?? null,
    isWhitelisted: state.isWhitelisted ?? null,
    hasSignature: state.hasSignature,
  };

  return (
    <VaultContextProvider vaultAddress={vaultAddress} params={params}>
      <VaultContent />
    </VaultContextProvider>
  );
}
