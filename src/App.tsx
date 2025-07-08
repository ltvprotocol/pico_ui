import { useEffect, useState } from 'react';
import { useAppContext } from '@/contexts';
import { Routes, Route } from "react-router-dom";
import Layout from '@/components/Layout';
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