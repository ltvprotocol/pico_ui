import { useParams } from 'react-router-dom';

import { VaultContextProvider } from "@/contexts";

import Balances from "@/components/vault/Balances";
import Information from "@/components/vault/Information";
import Tabs from "@/components/vault/Tabs";
import Header from '@/components/vault/Header';
import Addresses from '@/components/vault/Addresses';

export default function Vault() {
  const { vaultAddress } = useParams<{ vaultAddress: string }>();

  if(!vaultAddress) return;

  return (
    <VaultContextProvider vaultAddress={vaultAddress}>
      <div className="p-3">
        <Header />
        <Addresses />
        <Information />
        <Balances />
        <Tabs />
      </div>
    </VaultContextProvider>
  );
}
