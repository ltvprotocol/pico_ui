import { useLocation, useParams } from 'react-router-dom';
import { VaultContextProvider, useVaultContext } from "@/contexts";
import { useAppContext } from "@/contexts";
import UnrecognizedNetwork from "@/components/vault/UnrecognizedNetwork";
import MoreInfo from "@/components/vault/MoreInfo";
import Actions from "@/components/vault/Actions";
import VaultHeader from '@/components/vault/VaultHeader';
import Info from '@/components/vault/Info';
import LowLevelRebalance from '@/components/vault/LowLevelRebalance';
import Auction from '@/components/vault/Auction';
import VaultNotFound from '@/components/vault/VaultNotFound';

function VaultContent() {
  const { vaultExists, vaultConfig } = useVaultContext();
  const { unrecognizedNetworkParam } = useAppContext();

  if (unrecognizedNetworkParam) {
    return <UnrecognizedNetwork />;
  }

  if (vaultExists === false) {
    return <VaultNotFound />;
  }

  return (
    <>
      <VaultHeader />
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
      <div className="mb-4">
        <Auction />
      </div>
      <MoreInfo />
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
  };

  return (
    <VaultContextProvider vaultAddress={vaultAddress} params={params}>
      <VaultContent />
    </VaultContextProvider>
  );
}
