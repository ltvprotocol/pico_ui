import { useParams } from 'react-router-dom';
import { VaultContextProvider } from "@/contexts";
import Balances from "@/components/Balances";
import VaultInfo from "@/components/VaultInfo";
import Tabs from "@/components/Tabs";
import VaultHeader from '@/components/VaultHeader';

export default function VaultPage() {
  const { vaultAddress } = useParams<{ vaultAddress: string }>();

  if(!vaultAddress) return;

  return (
    <VaultContextProvider vaultAddress={vaultAddress}>
      <div className="p-3">
        <VaultHeader vaultAddress={vaultAddress} />
        <VaultInfo />
        <Balances />
        <Tabs />
      </div>
    </VaultContextProvider>
  );
}
