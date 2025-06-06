import { BrowserProvider, JsonRpcSigner } from 'ethers'
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react'

interface AppContextType {
  isConnected: boolean;
  provider: BrowserProvider | null;
  signer: JsonRpcSigner | null;
  address: string | null;
  chainId: bigint | null;
  updateProvider: React.Dispatch<React.SetStateAction<BrowserProvider | null>>;
  updateSigner: React.Dispatch<React.SetStateAction<JsonRpcSigner | null>>;
  updateAddress: React.Dispatch<React.SetStateAction<string | null>>;
  updateChainId: React.Dispatch<React.SetStateAction<bigint | null>>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppContextProvider = ({ children }: { children: ReactNode }) => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<bigint | null>(null);

  useEffect(() => {
    if(provider && signer) {
      setIsConnected(true);
    } else {
      setIsConnected(false);
    }
  }, [provider, signer])

  return (
    <AppContext.Provider
      value={{
        isConnected,
        provider,
        signer,
        address,
        chainId,
        updateProvider: setProvider,
        updateSigner: setSigner,
        updateChainId: setChainId,
        updateAddress: setAddress
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export const useAppContext = () => {
  const context = useContext(AppContext)
  if (!context) throw new Error('useAppContext must be used within a AppContextProvider')
  return context
}