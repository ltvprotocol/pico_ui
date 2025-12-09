import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { useEffect, useRef } from 'react';
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
import FlashLoanDepositWithdraw from '@/components/vault/FlashLoanDepositWithdraw';
import FlashLoanDepositWithdrawForm from '@/components/vault/FlashLoanDepositWithdrawForm';
import ActionsDropdown from '@/components/vault/ActionsDropdown';

function VaultContent() {
  const {
    vaultExists, vaultConfig,
    isWhitelistActivated, isWhitelisted,
    flashLoanMintHelperAddress, flashLoanRedeemHelperAddress
  } = useVaultContext();

  const { unrecognizedNetworkParam, isTermsBlockingUI, isMainnet } = useAppContext();

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

  // Block UI when terms status is unknown, not signed, or fetch failed
  const isUIDisabled = isWhitelistDisabled || isTermsBlockingUI;
  const isPartiallyDisabled = vaultConfig?.partiallyDisabled === true;

  const partiallyDisabledMode = isUIDisabled || isPartiallyDisabled;

  return (
    <>
      <VaultHeader />
      <WhitelistBanner />
      <div className="flex flex-col [@media(min-width:768px)]:flex-row gap-4 mb-4">
        <div className="flex-1">
          <div className={isUIDisabled ? 'opacity-50 pointer-events-none' : ''}>
            <Info />
          </div>
        </div>
        <div className="flex-1">
          {
            isMainnet ? 
            <div className={`${isUIDisabled ? 'opacity-50 pointer-events-none' : ''}`}>
              <FlashLoanDepositWithdrawForm />
            </div> :
            <div className={partiallyDisabledMode ? 'opacity-50 pointer-events-none' : ''}>
              <Actions isSafe={vaultConfig && (vaultConfig as any).useSafeActions} />
            </div>
          }
        </div>
      </div>
      {hasFlashLoanHelper && (
        <>
          <div className={`mb-4 ${isUIDisabled ? 'opacity-50 pointer-events-none' : ''}`}>
            <FlashLoanDepositWithdraw />
          </div>
          <div className={`mb-4 ${isUIDisabled ? 'opacity-50 pointer-events-none' : ''}`}>
            <FlashLoanHelper />
          </div>
        </>
      )}
      {isMainnet &&
        <>
          <div className={`mb-4 ${isUIDisabled ? 'opacity-50 pointer-events-none' : ''}`}>
            <MoreInfo />
          </div>
          <div className={`mb-4 ${partiallyDisabledMode ? 'opacity-50 pointer-events-none' : ''}`}>
            <ActionsDropdown />
          </div>
        </>
      }
      <div className={`mb-4 ${partiallyDisabledMode ? 'opacity-50 pointer-events-none' : ''}`}>
        <LowLevelRebalance />
      </div>
      <div className={`${partiallyDisabledMode ? 'opacity-50 pointer-events-none' : ''}`}>
        <Auction />
      </div>
      {!isMainnet &&
        <div className={`mt-4 ${isUIDisabled ? 'opacity-50 pointer-events-none' : ''}`}>
          <MoreInfo />
        </div>
      }
    </>
  );
}

export default function Vault() {
  const { vaultAddress } = useParams<{ vaultAddress: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { currentNetwork } = useAppContext();
  const state = location.state || {};

  // Track initial network to detect changes
  const initialNetworkRef = useRef<string | null>(null);

  // Redirect to home when network changes
  useEffect(() => {
    // On first render, store the current network
    if (!initialNetworkRef.current) {
      initialNetworkRef.current = currentNetwork;
      return;
    }

    // If network changed from initial network, redirect to home
    if (currentNetwork && initialNetworkRef.current && currentNetwork !== initialNetworkRef.current) {
      navigate('/');
    }
  }, [currentNetwork]);

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
