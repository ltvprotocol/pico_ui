import { useLocation, useParams } from 'react-router-dom';
import { VaultContextProvider } from "@/contexts";
import Balances from "@/components/vault/Balances";
import Information from "@/components/vault/Information";
import Actions from "@/components/vault/Actions";
import Header from '@/components/vault/Header';
import Addresses from '@/components/vault/Addresses';

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
      <Header />
      <Addresses />
      <Actions />
      <Balances />
      <Information />
    </VaultContextProvider>
  );
}
