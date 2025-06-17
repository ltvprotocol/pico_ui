import { createContext, ReactNode, useContext, useEffect, useState, useCallback } from 'react';
import { BrowserProvider, JsonRpcSigner, JsonRpcProvider } from 'ethers';
import { SEPOLIA_NETWORK } from '@/constants';

interface AppContextType {
  publicProvider: JsonRpcProvider | null;
  isConnected: boolean;
  provider: BrowserProvider | null;
  signer: JsonRpcSigner | null;
  address: string | null;
  chainId: bigint | null;
  updateProvider: (p: BrowserProvider | null) => void;
  updateSigner: (s: JsonRpcSigner | null) => void;
  updateAddress: (a: string | null) => void;
  updateChainId: (id: bigint | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppContextProvider = ({ children }: { children: ReactNode }) => {
  const [publicProvider, setPublicProvider] = useState<JsonRpcProvider | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<bigint | null>(null);

  const isConnected = Boolean(provider && signer && address);

  useEffect(() => {
    const newPublicProvider = new JsonRpcProvider(SEPOLIA_NETWORK.rpcUrls[0]);
    setPublicProvider(newPublicProvider);
  }, []);

  const updateProvider = useCallback((p: BrowserProvider | null) => setProvider(p), []);
  const updateSigner = useCallback((s: JsonRpcSigner | null) => setSigner(s), []);
  const updateAddress = useCallback((a: string | null) => setAddress(a), []);
  const updateChainId = useCallback((id: bigint | null) => setChainId(id), []);

  const contextValue: AppContextType = {
    publicProvider,
    isConnected,
    provider,
    signer,
    address,
    chainId,
    updateProvider,
    updateSigner,
    updateAddress,
    updateChainId,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within a AppContextProvider');
  return context;
};