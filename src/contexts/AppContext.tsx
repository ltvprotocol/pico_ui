import { createContext, ReactNode, useContext, useEffect, useState, useCallback } from 'react';
import { BrowserProvider, JsonRpcSigner, JsonRpcProvider, Eip1193Provider } from 'ethers';
import { SEPOLIA_CHAIN_ID, MAINNET_CHAIN_ID, NETWORK_CONFIGS, URL_PARAM_TO_CHAIN_ID, SAFE_HELPER_ADDRESSES } from '@/constants';
import { Safe4626Helper, Safe4626CollateralHelper } from '@/typechain-types';
import { Safe4626Helper__factory, Safe4626CollateralHelper__factory } from '@/typechain-types/factories';
import { isUserRejected, checkTermsOfUseStatus, fetchTermsOfUseText, submitTermsOfUseSignature } from '@/utils';

type DiscoveredWallet = {
  info: {
    uuid: string;
    name: string;
    icon: string;
  };
  provider: Eip1193Provider;
};

interface AppContextType {
  wallets: DiscoveredWallet[];
  publicProvider: JsonRpcProvider | null;
  provider: BrowserProvider | null;
  signer: JsonRpcSigner | null;
  address: string | null;
  chainId: bigint | null;
  isConnected: boolean;
  isSepolia: boolean;
  isMainnet: boolean;
  currentNetwork: string | null;
  unrecognizedNetworkParam: boolean;
  connectingWalletId: string | null;
  isAutoConnecting: boolean;
  error: string | null;
  connectWallet: (wallet: DiscoveredWallet) => Promise<void>;
  disconnectWallet: () => void;
  switchToSepolia: () => Promise<void>;
  switchToMainnet: () => Promise<void>;
  switchToNetwork: (chainId: string) => Promise<void>;
  // Safe helpers
  safeHelperAddressBorrow?: string | null;
  safeHelperAddressCollateral?: string | null;
  safeHelperBorrow?: Safe4626Helper | null;
  safeHelperCollateral?: Safe4626CollateralHelper | null;
  // Terms of use
  isTermsSigned: boolean | null;
  termsText: string | null;
  isCheckingTerms: boolean;
  isSigningTerms: boolean;
  termsCheckingError: boolean | undefined;
  termsTextFetchingError: boolean | undefined;
  termsSigningError: boolean | undefined;
  isTermsBlockingUI: boolean;
  checkTermsStatus: () => Promise<void>;
  signTermsOfUse: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppContextProvider = ({ children }: { children: ReactNode }) => {
  const [isAutoConnecting, setIsAutoConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [wallets, setWallets] = useState<DiscoveredWallet[]>([]);
  const [connectingWalletId, setConnectingWalletId] = useState<string | null>(null);
  const [isSepolia, setIsSepolia] = useState(false);
  const [isMainnet, setIsMainnet] = useState(false);
  const [currentNetwork, setCurrentNetwork] = useState<string | null>(null);
  const [unrecognizedNetworkParam, setUnrecognizedNetworkParam] = useState<boolean>(false);

  const [publicProvider, setPublicProvider] = useState<JsonRpcProvider | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<bigint | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const [rawProvider, setRawProvider] = useState<Eip1193Provider | null>(null);

  // Safe helper state
  const [safeHelperAddressBorrow, setSafeHelperAddressBorrow] = useState<string | null>(null);
  const [safeHelperAddressCollateral, setSafeHelperAddressCollateral] = useState<string | null>(null);
  const [safeHelperBorrow, setSafeHelperBorrow] = useState<Safe4626Helper | null>(null);
  const [safeHelperCollateral, setSafeHelperCollateral] = useState<Safe4626CollateralHelper | null>(null);

  // Terms of use state
  const [isTermsSigned, setIsTermsSigned] = useState<boolean | null>(null);
  const [termsText, setTermsText] = useState<string | null>(null);
  const [isCheckingTerms, setIsCheckingTerms] = useState(false);
  const [isSigningTerms, setIsSigningTerms] = useState(false);
  const [termsCheckingError, setTermsCheckingError] = useState<boolean | undefined>(undefined);
  const [termsTextFetchingError, setTermsTextFetchingError] = useState<boolean | undefined>(undefined);
  const [termsSigningError, setTermsSigningError] = useState<boolean | undefined>(undefined);
  const [isTermsBlockingUI, setIsTermsBlockingUI] = useState(false);

  const getNetworkFromUrl = useCallback(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const networkParam = urlParams.get('network');
    
    if (!networkParam) {
      setUnrecognizedNetworkParam(false);
      return null;
    }
    
    const recognizedNetwork = URL_PARAM_TO_CHAIN_ID[networkParam as keyof typeof URL_PARAM_TO_CHAIN_ID];
    
    if (!recognizedNetwork) {
      console.warn(`Unrecognized network parameter: "${networkParam}".`);
      setUnrecognizedNetworkParam(true);
      return null;
    }
    
    setUnrecognizedNetworkParam(false);
    return recognizedNetwork;
  }, []);

  const getDefaultNetwork = useCallback(() => {
    const urlNetwork = getNetworkFromUrl();
    return urlNetwork ?? '11155111';
  }, [getNetworkFromUrl]);

  useEffect(() => {
    const discovered: DiscoveredWallet[] = [];

    const handleAnnounce = (event: Event) => {
      const newWallet = (event as CustomEvent).detail as DiscoveredWallet;
      const alreadyExists = discovered.some(
        wallet => wallet.info.name === newWallet.info.name
      );

      if (!alreadyExists) {
        discovered.push(newWallet);
      }

      setWallets([...discovered]);
    };

    window.addEventListener('eip6963:announceProvider', handleAnnounce);
    window.dispatchEvent(new Event('eip6963:requestProvider'));

    return () => {
      window.removeEventListener('eip6963:announceProvider', handleAnnounce);
    };
  }, []);

  useEffect(() => {
    setIsConnected(Boolean(provider && signer && address));
  }, [provider, signer, address]);

  // Initialize mock helper addresses per network and instantiate helpers when signer is available
  useEffect(() => {
    const chainIdStr = currentNetwork;
    if (!chainIdStr) {
      setSafeHelperAddressBorrow(null);
      setSafeHelperAddressCollateral(null);
      setSafeHelperBorrow(null);
      setSafeHelperCollateral(null);
      return;
    }

    const cfg = SAFE_HELPER_ADDRESSES[chainIdStr];
    if (!cfg) {
      setSafeHelperAddressBorrow(null);
      setSafeHelperAddressCollateral(null);
      setSafeHelperBorrow(null);
      setSafeHelperCollateral(null);
      return;
    }

    setSafeHelperAddressBorrow(cfg.borrow);
    setSafeHelperAddressCollateral(cfg.collateral);

    if (signer) {
      try {
        const borrowHelper = Safe4626Helper__factory.connect(cfg.borrow, signer);
        const collateralHelper = Safe4626CollateralHelper__factory.connect(cfg.collateral, signer);
        setSafeHelperBorrow(borrowHelper);
        setSafeHelperCollateral(collateralHelper);
      } catch (e) {
        console.error('Failed to initialize safe helpers:', e);
        setSafeHelperBorrow(null);
        setSafeHelperCollateral(null);
      }
    } else {
      setSafeHelperBorrow(null);
      setSafeHelperCollateral(null);
    }
  }, [currentNetwork, signer]);

  useEffect(() => {
    const defaultNetwork = getDefaultNetwork();
    const networkConfig = (NETWORK_CONFIGS as any)[defaultNetwork];
    if (networkConfig) {
      const newPublicProvider = new JsonRpcProvider(networkConfig.rpcUrls[0]);
      setPublicProvider(newPublicProvider);
      setCurrentNetwork(defaultNetwork);
    } else {
      setPublicProvider(null);
      setCurrentNetwork(null);
    }
  }, [getDefaultNetwork]);

  const switchToNetwork = useCallback(async (chainId: string) => {
    const networkConfig = (NETWORK_CONFIGS as any)[chainId];
    if (!networkConfig) {
      console.error('Unknown network chain ID:', chainId);
      return;
    }

    const urlParam = Object.keys(URL_PARAM_TO_CHAIN_ID).find(
      key => URL_PARAM_TO_CHAIN_ID[key as keyof typeof URL_PARAM_TO_CHAIN_ID] === chainId
    );
    
    if (urlParam) {
      const url = new URL(window.location.href);
      url.searchParams.set('network', urlParam);
      window.history.pushState({}, '', url.toString());
    }

    const newPublicProvider = new JsonRpcProvider(networkConfig.rpcUrls[0]);
    setPublicProvider(newPublicProvider);
    setCurrentNetwork(chainId);

    if (provider) {
      try {
        await provider.send('wallet_switchEthereumChain', [
          { chainId: networkConfig.chainId },
        ]);
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (err: any) {
        if (err.code === 4902 || err.error?.code === 4902) {
          try {
            await provider.send('wallet_addEthereumChain', [networkConfig]);
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (addError) {
            console.error(`Error adding ${networkConfig.name} network:`, addError);
          }
        } else {
          console.error(`Error switching to ${networkConfig.name}:`, err);
        }
      }
    }
  }, [provider]);

  useEffect(() => {
    const autoSwitchToUrlNetwork = async () => {
      if (!isConnected || !provider) return;
      
      const urlNetwork = getNetworkFromUrl();
      if (!urlNetwork) return;
      
      const currentChainId = chainId?.toString();
      if (currentChainId === urlNetwork) return;
      
      try {
        await switchToNetwork(urlNetwork);
      } catch (error) {
        console.log('Auto-switch to URL network failed:', error);
      }
    };

    autoSwitchToUrlNetwork();
  }, [isConnected, provider, chainId, getNetworkFromUrl, switchToNetwork]);

  const disconnectWallet = useCallback(() => {
    setProvider(null);
    setSigner(null);
    setAddress(null);
    setChainId(null);
    setIsConnected(false);
    setIsSepolia(false);
    setIsMainnet(false);
    setRawProvider(null);
    setIsTermsSigned(null);
    setTermsCheckingError(undefined);
    localStorage.removeItem('connectedWallet');
  }, []);

  const setupProviderConnection = async (eip1193Provider: Eip1193Provider) => {
    if (!eip1193Provider) {
      disconnectWallet();
      return;
    }

    try {
      const newProvider = new BrowserProvider(eip1193Provider);
      const newSigner = await newProvider.getSigner();
      const newAddress = await newSigner.getAddress();
      const network = await newProvider.getNetwork();
      const newChainId = network.chainId;
      const chainIdString = newChainId.toString();

      const isSepoliaNetwork = newChainId === SEPOLIA_CHAIN_ID;
      const isMainnetNetwork = newChainId === MAINNET_CHAIN_ID;

      setIsSepolia(isSepoliaNetwork);
      setIsMainnet(isMainnetNetwork);
      setCurrentNetwork(chainIdString);
      setProvider(newProvider);
      setSigner(newSigner);
      setAddress(newAddress);
      setChainId(newChainId);
      setRawProvider(eip1193Provider);

      // Update publicProvider to match the wallet's network
      // Only do this if there's no URL network param, or if it matches
      const urlNetwork = getNetworkFromUrl();
      if (!urlNetwork || urlNetwork === chainIdString) {
        const networkConfig = (NETWORK_CONFIGS as any)[chainIdString];
        if (networkConfig) {
          const newPublicProvider = new JsonRpcProvider(networkConfig.rpcUrls[0]);
          setPublicProvider(newPublicProvider);
        }
      }
      // If URL network differs, the auto-switch effect will handle it
    } catch (err) {
      console.error("Error in setupProviderConnection:", err);
      disconnectWallet();
    }
  };

  const connectWallet = useCallback(async (wallet: DiscoveredWallet, expectedAddress?: string) => {
    setConnectingWalletId(wallet.info.uuid);
    setError(null);

    try {
      await wallet.provider.request({ method: 'eth_requestAccounts' });
      await setupProviderConnection(wallet.provider);

      const tempProvider = new BrowserProvider(wallet.provider);
      const tempSigner = await tempProvider.getSigner();
      const currentAddress = await tempSigner.getAddress();
      
      if (expectedAddress && expectedAddress.toLowerCase() !== currentAddress.toLowerCase()) {
        console.warn("Address mismatch, user selected another account");
      }

      // Update URL to reflect the connected network
      const network = await tempProvider.getNetwork();
      const chainIdString = network.chainId.toString();
      const networkConfig = (NETWORK_CONFIGS as any)[chainIdString];
      if (networkConfig) {
        const urlParam = Object.keys(URL_PARAM_TO_CHAIN_ID).find(
          key => URL_PARAM_TO_CHAIN_ID[key as keyof typeof URL_PARAM_TO_CHAIN_ID] === chainIdString
        );
        
        if (urlParam) {
          const url = new URL(window.location.href);
          url.searchParams.set('network', urlParam);
          window.history.pushState({}, '', url.toString());
        }
      }

      localStorage.setItem('connectedWallet', JSON.stringify({
        name: wallet.info.name,
        address: currentAddress
      }));
      setConnectingWalletId(null);
    } catch (err: any) {
      setConnectingWalletId(null);

      if (isUserRejected(err)) {
        setError('Connection canceled by user.');
      } else {
        setError('Connection failed. Please try again.');
        console.error('Connection failed:', err);
      }

      disconnectWallet();
    }
  }, [disconnectWallet]);

  useEffect(() => {
    const reconnect = async () => {
      const saved = localStorage.getItem('connectedWallet');
      if (!saved || isConnected || wallets.length === 0) {
        setIsAutoConnecting(false);
        return;
      }

      const { name, address } = JSON.parse(saved) as { name: string; address: string };

      const walletToConnect = wallets.find(w => w.info.name === name);
      if (walletToConnect) {
        try {
          await connectWallet(walletToConnect, address);
        } catch (err) {
          console.error('Auto-reconnect failed:', err);
        } finally {
          setIsAutoConnecting(false);
        }
      } else {
        localStorage.removeItem('connectedWallet');
        setIsAutoConnecting(false);
      }
    };

    if (wallets.length > 0 && !isConnected && isAutoConnecting) {
      reconnect();
    }
  }, [wallets, isConnected, isAutoConnecting, connectWallet]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isAutoConnecting && wallets.length === 0) {
        setIsAutoConnecting(false);
      }
    }, 1000);

    return () => clearTimeout(timeout);
  }, [isAutoConnecting, wallets.length]);

  useEffect(() => {
    if (!rawProvider) return;

    const eip1193Provider = rawProvider as unknown as {
      on: (event: string, listener: (...args: any[]) => void) => void;
      removeListener?: (event: string, listener: (...args: any[]) => void) => void;
    }; 

    if (eip1193Provider && typeof eip1193Provider.on === 'function') { 
      const onAccountsChangedHandler = async (accounts: string[]) => {
        if (accounts.length > 0 && provider) {
          const signer = await provider.getSigner();
          const addr = await signer.getAddress();
          setAddress(addr);
          await setupProviderConnection(rawProvider);
        } else {
          disconnectWallet();
        }
      };

      const onChainChangedHandler = async (chainIdHex: string) => {
        console.log('Event: chainChanged, new chainIdHex:', chainIdHex);

        const chainIdBigInt = BigInt(chainIdHex);
        const chainIdString = chainIdBigInt.toString();

        // Update URL parameter to match the new network
        const networkConfig = (NETWORK_CONFIGS as any)[chainIdString];
        if (networkConfig) {
          const urlParam = Object.keys(URL_PARAM_TO_CHAIN_ID).find(
            key => URL_PARAM_TO_CHAIN_ID[key as keyof typeof URL_PARAM_TO_CHAIN_ID] === chainIdString
          );
          
          if (urlParam) {
            const url = new URL(window.location.href);
            url.searchParams.set('network', urlParam);
            window.history.pushState({}, '', url.toString());
          }

          // Update publicProvider to match the new network
          const newPublicProvider = new JsonRpcProvider(networkConfig.rpcUrls[0]);
          setPublicProvider(newPublicProvider);
        }

        // Update all wallet connection state (this also sets currentNetwork, chainId, etc.)
        await setupProviderConnection(rawProvider);
      };

      eip1193Provider.on('accountsChanged', onAccountsChangedHandler);
      eip1193Provider.on('chainChanged', onChainChangedHandler);

      return () => {
        if (typeof eip1193Provider.removeListener === 'function') {
          eip1193Provider.removeListener('accountsChanged', onAccountsChangedHandler);
          eip1193Provider.removeListener('chainChanged', onChainChangedHandler);
        }
      };
    }
  }, [rawProvider, provider]);

  const switchToSepolia = useCallback(async () => {
    await switchToNetwork('11155111');
  }, [switchToNetwork]);

  const switchToMainnet = useCallback(async () => {
    await switchToNetwork('1');
  }, [switchToNetwork]);

  // Load terms text on mount
  useEffect(() => {
    const loadTermsText = async () => {
      try {
        const text = await fetchTermsOfUseText(currentNetwork);
        if (text) {
          setTermsText(text);
          setTermsTextFetchingError(false);
        } else {
          // If fetch returned null, it means the backend failed
          setTermsTextFetchingError(true);
          setTermsText(null);
        }
      } catch (error) {
        console.error('Error loading terms text:', error);
        setTermsTextFetchingError(true);
        setTermsText(null);
      }
    };
    loadTermsText();
  }, [currentNetwork]);

  const checkTermsStatus = useCallback(async () => {
    if (!address || !currentNetwork) {
      setIsTermsSigned(null);
      return;
    }

    setIsCheckingTerms(true);

    try {
      const status = await checkTermsOfUseStatus(address, currentNetwork);
      if (status) {
        setIsTermsSigned(status.signed);
      } else {
        setIsTermsSigned(false);
        setTermsCheckingError(true);
      }
    } catch (error) {
      console.error('Error checking terms status:', error);
      setIsTermsSigned(false);
      setTermsCheckingError(true);
    } finally {
      setIsCheckingTerms(false);
    }
  }, [address, currentNetwork]);

  const signTermsOfUse = useCallback(async () => {
    if (!signer || !address || !termsText || !currentNetwork) {
      setTermsSigningError(true);
      return;
    }

    setIsSigningTerms(true);

    try {
      const signature = await signer.signMessage(termsText);
      
      const result = await submitTermsOfUseSignature(address, signature, currentNetwork);
      if (result && result.success) {
        setIsTermsSigned(true);
      } else {
        setTermsSigningError(true);
      }
    } catch (error: any) {
      if (isUserRejected(error)) {
        setTermsSigningError(true);
      } else {
        console.error('Error signing terms:', error);
        setTermsSigningError(true);
      }
    } finally {
      setIsSigningTerms(false);
    }
  }, [signer, address, termsText, currentNetwork]);

  const [hasAttemptedAutoSign, setHasAttemptedAutoSign] = useState(false);

  // Check terms when wallet connects or address changes
  useEffect(() => {
    if (isConnected && address) {
      setIsTermsSigned(null);
      setHasAttemptedAutoSign(false);
      checkTermsStatus();
    } else {
      setIsTermsSigned(null);
      setHasAttemptedAutoSign(false);
    }
  }, [isConnected, address, checkTermsStatus]);

  // Auto-sign terms when wallet connects and terms are not signed
  useEffect(() => {
    if (
      isConnected &&
      isTermsSigned === false &&
      signer &&
      address &&
      termsText &&
      currentNetwork &&
      !isSigningTerms &&
      !isCheckingTerms &&
      !hasAttemptedAutoSign
    ) {
      setHasAttemptedAutoSign(true);
      signTermsOfUse();
    }
  }, [
    isConnected,
    isTermsSigned,
    signer,
    address,
    termsText,
    currentNetwork,
    isSigningTerms,
    isCheckingTerms,
    hasAttemptedAutoSign,
    signTermsOfUse,
  ]);

  // Reset terms state on disconnect
  useEffect(() => {
    if (!isConnected) {
      setIsTermsSigned(null);
      setTermsCheckingError(undefined);
      setTermsSigningError(undefined);
      setHasAttemptedAutoSign(false);
      setTermsTextFetchingError(false);
    }
  }, [isConnected]);

  // Compute if UI should be blocked due to terms
  useEffect(() => {
    if (!isConnected) {
      setIsTermsBlockingUI(false);
      return;
    }
    if (isTermsSigned === true) {
      setIsTermsBlockingUI(false);
      return;
    }
    if (isTermsSigned === false) {
      setIsTermsBlockingUI(true);
      return;
    }
    if (isTermsSigned === null) {
      setIsTermsBlockingUI(true);
      return;
    }
    if (termsTextFetchingError || termsCheckingError || termsSigningError) {
      setIsTermsBlockingUI(true);
      return;
    }
    setIsTermsBlockingUI(true);
  }, [isConnected, isTermsSigned, termsTextFetchingError, termsCheckingError, termsSigningError]);

  const contextValue: AppContextType = {
    wallets,
    publicProvider,
    isConnected,
    provider,
    signer,
    address,
    chainId,
    isSepolia,
    isMainnet,
    currentNetwork,
    unrecognizedNetworkParam,
    connectingWalletId,
    isAutoConnecting,
    error,
    connectWallet,
    disconnectWallet,
    switchToSepolia,
    switchToMainnet,
    switchToNetwork,
    safeHelperAddressBorrow,
    safeHelperAddressCollateral,
    safeHelperBorrow,
    safeHelperCollateral,
    // Terms of use
    isTermsSigned,
    termsText,
    isCheckingTerms,
    isSigningTerms,
    termsCheckingError,
    termsTextFetchingError,
    termsSigningError,
    isTermsBlockingUI,
    checkTermsStatus,
    signTermsOfUse,
  };

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within a AppContextProvider');
  return context;
};
