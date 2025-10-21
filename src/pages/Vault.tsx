import { useLocation, useParams } from 'react-router-dom';
import { VaultContextProvider } from "@/contexts";
import Info from "@/components/vault/Info";
import MoreInfo from "@/components/vault/MoreInfo";
import Actions from "@/components/vault/Actions";
import Header from '@/components/vault/Header';

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
      <Header className="mb-6" />
      <Info  className="mb-6"/>
      <Actions className="mb-6"/>
      <MoreInfo />
    </VaultContextProvider>
  );
}
