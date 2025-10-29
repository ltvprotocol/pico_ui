import { Routes, Route } from "react-router-dom";
import { useAppContext } from '@/contexts';
import HomeLayout from '@/components/HomeLayout';
import VaultLayout from '@/components/VaultLayout';
import Home from './pages/Home';
import Vault from './pages/Vault';

function App() {
  const { isConnected, isSepolia, isMainnet, isAutoConnecting } = useAppContext();

  const showContent = isConnected && (isSepolia || isMainnet);
  const showWelcome = !isConnected && !isAutoConnecting;

  return (
    <Routes>
      <Route path="/" element={
        <HomeLayout showContent={showContent} showWelcome={showWelcome}>
          <Home />
        </HomeLayout>
      } />
      <Route path="/:vaultAddress" element={
        <VaultLayout showContent={showContent} showWelcome={showWelcome}>
          <Vault />
        </VaultLayout>
      } />
    </Routes>
  );
}

export default App;