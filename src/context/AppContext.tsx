import { BrowserProvider, JsonRpcSigner, JsonRpcProvider } from 'ethers'
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react'
import { GmeVault, WETH, GmeVault__factory, WETH__factory } from '@/typechain-types';
import { GME_VAULT_ADDRESS, WETH_ADDRESS, SEPOLIA_NETWORK } from '@/constants';

interface AppContextType {
  publicProvider: JsonRpcProvider | null;
  isConnected: boolean;
  provider: BrowserProvider | null;
  signer: JsonRpcSigner | null;
  address: string | null;
  chainId: bigint | null;
  vaultContract: GmeVault | null;
  wethContract: WETH | null;
  vaultContractLens: GmeVault | null;
  wethContractLens: WETH | null;
  updateProvider: React.Dispatch<React.SetStateAction<BrowserProvider | null>>;
  updateSigner: React.Dispatch<React.SetStateAction<JsonRpcSigner | null>>;
  updateAddress: React.Dispatch<React.SetStateAction<string | null>>;
  updateChainId: React.Dispatch<React.SetStateAction<bigint | null>>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppContextProvider = ({ children }: { children: ReactNode }) => {
  const [publicProvider, setPublicProvider] = useState<JsonRpcProvider | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<bigint | null>(null);

  const [vaultContract, setVaultContract] = useState<GmeVault | null>(null);
  const [wethContract, setWethContract] = useState<WETH | null>(null);
  const [vaultContractLens, setVaultContractLens] = useState<GmeVault | null>(null);
  const [wethContractLens, setWethContractlens] = useState<WETH | null>(null);

  useEffect(() => {
    const newPublicProvider = new JsonRpcProvider(SEPOLIA_NETWORK.rpcUrls[0]);
    setPublicProvider(newPublicProvider);
  }, []);

  useEffect(() => {
    if(provider && signer) {
      setIsConnected(true);
    } else {
      setIsConnected(false);
    }
  }, [provider, signer]);

  useEffect(() => {
    if(provider && signer) {
      const vaultContractInstance = GmeVault__factory.connect(GME_VAULT_ADDRESS, signer);
      setVaultContract(vaultContractInstance);
      const wethContractInstance = WETH__factory.connect(WETH_ADDRESS, signer);
      setWethContract(wethContractInstance);
    }
  }, [provider, signer]);

  useEffect(() => {
    if(publicProvider) {
      const vaultContractLensInstance = GmeVault__factory.connect(GME_VAULT_ADDRESS, publicProvider);
      setVaultContractLens(vaultContractLensInstance);
      const wethContractLensInstance = WETH__factory.connect(WETH_ADDRESS, publicProvider);
      setWethContractlens(wethContractLensInstance);
    }
  }, [publicProvider]);

  return (
    <AppContext.Provider
      value={{
        publicProvider,
        isConnected,
        provider,
        signer,
        address,
        chainId,
        vaultContract,
        wethContract,
        vaultContractLens,
        wethContractLens,
        updateProvider: setProvider,
        updateSigner: setSigner,
        updateChainId: setChainId,
        updateAddress: setAddress
      }}
    >
      {children}
    </AppContext.Provider>
  )
};

export const useAppContext = () => {
  const context = useContext(AppContext)
  if (!context) throw new Error('useAppContext must be used within a AppContextProvider')
  return context
};