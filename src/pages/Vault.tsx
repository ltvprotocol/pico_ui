import { useLocation, useParams } from 'react-router-dom';
import { VaultContextProvider } from "@/contexts";
import MoreInfo from "@/components/vault/MoreInfo";
import Actions from "@/components/vault/Actions";
import VaultHeader from '@/components/vault/VaultHeader';
import Info from '@/components/vault/Info';

export default function Vault() {
  const { vaultAddress } = useParams<{ vaultAddress: string }>();

  if (!vaultAddress) return;

  const location = useLocation();
  const state = location.state || {};

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
      <VaultHeader />
      <div className="flex flex-col [@media(min-width:768px)]:flex-row gap-4 mb-4">
        <div className="flex-1">
          <Info />
        </div>
        <div className="flex-1">
          <Actions />
        </div>
      </div>
      <MoreInfo />
    </VaultContextProvider>
  );
}
