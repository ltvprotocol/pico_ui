import { useEffect, useState } from 'react';
import { Routes, Route } from "react-router-dom";

import { useAppContext } from '@/contexts';
import { SEPOLIA_CHAIN_ID } from '@/constants';

import Layout from '@/components/Layout';
import Home from './pages/Home';
import Vault from './pages/Vault';

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
        <Route path="/" element={<Home />} />
        <Route path="/:vaultAddress" element={<Vault />} />
      </Routes>
    </Layout>
  );
}

export default App;