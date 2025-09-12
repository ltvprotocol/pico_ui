import { Routes, Route } from "react-router-dom";
import { useAppContext } from '@/contexts';
import Layout from '@/components/Layout';
import Home from './pages/Home';
import Vault from './pages/Vault';

function App() {
  const { isConnected, isSepolia } = useAppContext();

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