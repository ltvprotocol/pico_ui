import { useState, useEffect } from 'react';
import { BrowserProvider, Eip1193Provider } from 'ethers';
import { SEPOLIA_CHAIN_ID, SEPOLIA_CHAIN_ID_HEX, SEPOLIA_NETWORK } from '@/constants';
import { useAppContext } from '@/contexts';
import { isUserRejected } from '@/utils';
import { CopyAddress } from './ui/CopyAddress';

type DiscoveredWallet = {
  info: {
    uuid: string;
    name: string;
    icon: string; // base64 image
  };
  provider: Eip1193Provider;
}

export default function ConnectWallet() {
  const [wallets, setWallets] = useState<DiscoveredWallet[]>([]);
  const [loading, setLoading] = useState(false);
  const [connectingWalletId, setConnectingWalletId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [rawProvider, setRawProvider] = useState<Eip1193Provider | null>(null);
  const [isSepolia, setIsSepolia] = useState(false);

  const { 
    provider, signer, address,
    updateProvider, updateSigner, updateAddress, updateChainId 
  } = useAppContext();
  
  useEffect(() => {
    const discovered: DiscoveredWallet[] = [];

    const handleAnnounce = (event: Event) => {
      const newWallet = (event as CustomEvent).detail as DiscoveredWallet;
      const alreadyExists = discovered.some(wallet => 
        wallet.info.uuid === newWallet.info.uuid || wallet.info.name === newWallet.info.name
      );

      if (!alreadyExists) {
        discovered.push(newWallet);
      }
      
      setWallets([...discovered]);
    };

    window.addEventListener('eip6963:announceProvider', handleAnnounce);
    window.dispatchEvent(new Event('eip6963:requestProvider'));

    if(discovered.length == 0) {
      setError('Please, install MetaMask!');
    }

    return () => {
      window.removeEventListener('eip6963:announceProvider', handleAnnounce);
    };
  }, []);

  const disconnectWallet = () => {
    updateProvider(null);
    updateSigner(null);
    updateAddress(null);
    updateChainId(null);
    setIsSepolia(false);
  };

  const setupProviderConnection = async (eip1193Provider: Eip1193Provider) => {
    if (!eip1193Provider) {
      console.warn("setupProviderConnection called wihout provider!");
      disconnectWallet();
      return;
    }
  
    try {
      const newProvider = new BrowserProvider(eip1193Provider);
      const newSigner = await newProvider.getSigner();
      const newAddress = await newSigner.getAddress();
      const network = await newProvider.getNetwork();
      const newChainId = network.chainId;
  
      const isSepoliaNetwork = newChainId === SEPOLIA_CHAIN_ID;
      setIsSepolia(isSepoliaNetwork);

      console.log(
        `setupProviderConnection: Chain ID from ethersProvider.getNetwork(): ${network.chainId.toString()}. Is Sepolia: ${isSepoliaNetwork}. Address: ${newAddress}`
      );
  
      setRawProvider(eip1193Provider);

      updateProvider(newProvider);
      updateSigner(newSigner);
      updateAddress(newAddress);
      updateChainId(newChainId);
    } catch (error) {
      console.error("Error in setupProviderConnection:", error);
      disconnectWallet();
    }
  };

  const connectWallet = async (wallet: DiscoveredWallet) => {
    setConnectingWalletId(wallet.info.uuid);
    setLoading(true);
    setError(null);

    const newProvider = new BrowserProvider(wallet.provider);
    
    try {
      await newProvider.send('eth_requestAccounts', []);
      await setupProviderConnection(wallet.provider);
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
    } finally {
      setLoading(false);
    }
  };

  const switchToSepolia = async () => {
    if (!provider) return;
  
    try {
      await provider.send('wallet_switchEthereumChain', [
        { chainId: SEPOLIA_CHAIN_ID_HEX },
      ]);
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (err: any) {
      if (err.code === 4902 || err.error?.code === 4902) {
        try {
          await provider.send('wallet_addEthereumChain', [SEPOLIA_NETWORK]);
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (addError) {
          console.error('Error adding Sepolia network:', addError);
        }
      } else {
        console.error('Error switching to Sepolia:', err);
      }
    }
  };

  useEffect(() => {
    if(!rawProvider) return;

    const eip1193 = rawProvider as unknown as {
      on: (event: string, listener: (...args: any[]) => void) => void;
      removeListener?: (event: string, listener: (...args: any[]) => void) => void;
    };    

    if (eip1193 && typeof eip1193.on === 'function') {
      const onAccountsChangedHandler = async (accounts: string[]) => {
        console.log('Event: accountsChanged', accounts);
        if (accounts.length > 0) {
          updateAddress(accounts[0])
          if (rawProvider) {
            await setupProviderConnection(rawProvider);
          }
        } else {
          disconnectWallet();
        }
      };

      const onChainChangedHandler = async (chainIdHex: string) => {
        console.log('Event: chainChanged, new chainIdHex:', chainIdHex);
        const isSepoliaNetwork = chainIdHex === SEPOLIA_CHAIN_ID_HEX;
        if (rawProvider) {
          await setupProviderConnection(rawProvider);
        }
        setIsSepolia(isSepoliaNetwork);
        updateChainId(BigInt(chainIdHex));
      };

      eip1193.on('accountsChanged', onAccountsChangedHandler);
      eip1193.on('chainChanged', onChainChangedHandler);
      console.log("Event listeners added to:", eip1193);

      return () => {
        if (typeof eip1193.removeListener === 'function') {
          eip1193.removeListener('accountsChanged', onAccountsChangedHandler);
          eip1193.removeListener('chainChanged', onChainChangedHandler);
          console.log("Event listeners removed from:", eip1193);
        }
      };
    }
  }, [provider, signer, address]);

  return (
    <>
      {!address && wallets ? (
        <div className="mb-6 mt-6">
          <div className="text-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Connect Your Wallet
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              To start using the vault, you'll need to connect your wallet first
            </p>
          </div>
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  Make sure you have MetaMask or other wallet installed and are connected to the Sepolia network
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-col space-y-3">
            {wallets.map((wallet) => (
              <button
                key={wallet.info.uuid}
                onClick={() => connectWallet(wallet)}
                disabled={loading}
                className="
                  w-full flex justify-center items-center space-x-2 px-4 py-2 
                  border border-blue-300 bg-white dark:bg-white rounded-lg 
                  hover:bg-blue-50 dark:hover:bg-blue-50 hover:border-blue-600 
                  transition disabled:opacity-50
                "
              >
                <img
                  src={wallet.info.icon}
                  alt={wallet.info.name}
                  className="w-6 h-6"
                />
                <span>{connectingWalletId === wallet.info.uuid ? 'Connecting...' : wallet.info.name}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
          <>
            {!isSepolia ? ( 
              <div className="mb-6 mt-6">
                <div className="text-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    Switch to Sepolia
                  </h2>
                  <p className="text-sm text-gray-600 mb-4">
                    You are currently connected to the wrong network. Please switch to the Sepolia network.
                  </p>
                </div>
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-yellow-700">
                        Please connect to the Sepolia test network to continue. Your wallet is currently on a different network.
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={switchToSepolia}
                  disabled={loading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  Switch to Sepolia
                </button>
              </div>
          ) : (
            <div className="mb-[60px]">
              <div className="items-center justify-between mb-4 bg-gray-50 p-3 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="h-2 w-2 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-xs text-gray-500">Connected Wallet</span>
                  </div>
                  <button
                    onClick={disconnectWallet}
                    className="
                      text-sm text-red-500 hover:text-red-600 
                      border border-red-500 bg-white dark:bg-white rounded-lg 
                      hover:bg-pink-100 dark:hover:bg-pink-100 hover:border-red-500 
                      transition disabled:opacity-50"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                <div className="flex flex-col">
                  <h3 className="text-lg font-medium text-gray-900 mb-1">Wallet Address:</h3>
                  <CopyAddress address={address ? address : ""} />
                </div>
              </div>
            </div>
          )}
        </>
      )}
      {error && (
        <div className="mt-2 text-sm text-red-600">
          {error}
        </div>
      )}
    </>
  );
}