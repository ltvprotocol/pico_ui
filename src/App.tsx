import { useEffect, useState } from 'react';
import { useAppContext } from '@/contexts';
import { Routes, Route } from "react-router-dom";
import Layout from '@/components/Layout';
import Balances from '@/components/Balances';
import VaultInfo from '@/components/VaultInfo';
import Tabs from '@/components/Tabs';

import { SEPOLIA_CHAIN_ID } from '@/constants';
import HomePage from './pages/HomePage';
import VaultPage from './pages/VaultPage';

function App() {
  const [isSepolia, setIsSepolia] = useState(false);

  const { isConnected, chainId } = useAppContext();

  useEffect(() => {
    setIsSepolia(chainId === SEPOLIA_CHAIN_ID);
  }, [isConnected, chainId]);

  const showContent = isConnected && isSepolia;

  return (
    <Layout showContent={showContent}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/:vaultAddress" element={<VaultPage />} />
      </Routes>
    </Layout>

    // <Layout showContent={isConnected && isSepolia}>
    //   <Balances />
    //   <VaultInfo />
    //   <Tabs />
    //   <HomePage />
    // </Layout>
  );
}

export default App;