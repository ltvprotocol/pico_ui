import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

const GME_ADDRESS = '0xe2a7f267124ac3e4131f27b9159c78c521a44f3c';
const WETH_ADDRESS = '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14';

// Add Sepolia network constants
const SEPOLIA_CHAIN_ID = '0xaa36a7'; // 11155111 in hex
const SEPOLIA_NETWORK = {
  chainId: SEPOLIA_CHAIN_ID,
  chainName: 'Sepolia',
  nativeCurrency: {
    name: 'SepoliaETH',
    symbol: 'SEP',
    decimals: 18
  },
  rpcUrls: ['https://ethereum-sepolia-rpc.publicnode.com'],
  blockExplorerUrls: ['https://sepolia.etherscan.io']
};

type DiscoveredWallet = {
  info: {
    uuid: string;
    name: string;
    icon: string; // base64 image
  };
  provider: ethers.Eip1193Provider;
}

interface WalletConnectProps {
  onConnect?: (
    provider: ethers.BrowserProvider | null, 
    signer: ethers.JsonRpcSigner | null, 
    address: string | null
  ) => void;
  onWethBalance?: (balance: string) => void;
  onEthBalance?: (balance: string) => void;
  onGmeBalance: (balance: string) => void;
  onNetworkChange?: (isSepolia: boolean) => void;
}

export default function WalletConnect({ onConnect, onWethBalance, onEthBalance, onNetworkChange, onGmeBalance }: WalletConnectProps) {
  const [wallets, setWallets] = useState<DiscoveredWallet[]>([]);
  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gmeBalance, setGmeBalance] = useState<string>('0');
  const [wethBalance, setWethBalance] = useState<string>('0');
  const [ethBalance, setEthBalance] = useState<string>('0');
  const [isSepolia, setIsSepolia] = useState(false);
  const [rawProvider, setRawProvider] = useState<ethers.Eip1193Provider | null>(null)
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null)
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null)

  const resetBalances = () => {
    setEthBalance('0');
    setGmeBalance('0');
    setWethBalance('0');
    onEthBalance?.('0');
    onGmeBalance?.('0');
    onWethBalance?.('0');
  }

  const getBalances = async (address: string, currentProvider: ethers.BrowserProvider) => {
    try {
      if (!currentProvider) {
        console.warn("getBalances: currentProvider not defined");
        resetBalances();
        return;
      }
  
      const ethBalanceRaw = await currentProvider.getBalance(address);
      const formattedEthBalance = ethers.formatEther(ethBalanceRaw);
      setEthBalance(formattedEthBalance);
      onEthBalance?.(formattedEthBalance);
  
      const gmeContract = new ethers.Contract(
        GME_ADDRESS,
        [
          'function balanceOf(address owner) view returns (uint256)', 
          'function decimals() view returns (uint8)'
        ],
        currentProvider
      );

      const wethContract = new ethers.Contract(
        WETH_ADDRESS,
        [
          'function balanceOf(address) view returns (uint256)', 
          'function decimals() view returns (uint8)'
        ],
        currentProvider
      );
  
      const [gmeBalanceRaw, gmeDecimals, wethBalanceRaw, wethDecimals] = await Promise.all([
        gmeContract.balanceOf(address),
        gmeContract.decimals(),
        wethContract.balanceOf(address),
        wethContract.decimals()
      ]);
  
      const formattedGmeBalance = ethers.formatUnits(gmeBalanceRaw, gmeDecimals);
      const formattedWethBalance = ethers.formatUnits(wethBalanceRaw, wethDecimals);
  
      setGmeBalance(formattedGmeBalance);
      setWethBalance(formattedWethBalance);
      onWethBalance?.(wethBalanceRaw);
      onGmeBalance?.(gmeBalanceRaw);
  
    } catch (err) {
      console.error('Error fetching balances:', err);
      resetBalances();
    }
  };

  const setupProviderConnection = async (eip1193Provider: ethers.Eip1193Provider) => {
    if (!eip1193Provider) {
      console.warn("setupProviderConnection called wihout provider!");
      disconnectWallet();
      return;
    }
  
    try {
      const newEthersProvider = new ethers.BrowserProvider(eip1193Provider);
      const newSigner = await newEthersProvider.getSigner();
      const newAddress = await newSigner.getAddress();
      const network = await newEthersProvider.getNetwork();
  
      const isSepoliaNetwork = network.chainId === BigInt(SEPOLIA_CHAIN_ID);

      console.log(
        `setupProviderConnection: Chain ID from ethersProvider.getNetwork(): ${network.chainId.toString()}. Is Sepolia: ${isSepoliaNetwork}. Address: ${newAddress}`
      );
  
      setRawProvider(eip1193Provider);
      setProvider(newEthersProvider);
      setSigner(newSigner);
      setAddress(newAddress);
      setIsSepolia(isSepoliaNetwork);
  
      onConnect?.(newEthersProvider, newSigner, newAddress);
      onNetworkChange?.(isSepoliaNetwork);
  
      await getBalances(newAddress, newEthersProvider);
    } catch (error) {
      console.error("Error in setupProviderConnection:", error);
      disconnectWallet();
    }
  };

  useEffect(() => {
    const discovered: DiscoveredWallet[] = [];

    const handleAnnounce = (event: Event) => {
      const newWallet = (event as CustomEvent).detail as DiscoveredWallet;
      discovered.push(newWallet);
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
    setProvider(null);
    setSigner(null);
    setAddress(null);
    setIsSepolia(false);
    onConnect?.(null, null, null);
    onNetworkChange?.(false);
    resetBalances();
  };

  const connectWallet = async (wallet: DiscoveredWallet) => {
    setLoading(true);
    setError(null);

    const newProvider = new ethers.BrowserProvider(wallet.provider);
    
    try {
      await newProvider.send('eth_requestAccounts', []);
      await setupProviderConnection(wallet.provider);
    } catch (err: any) {
      if (err.code === 4001) {
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
        { chainId: SEPOLIA_CHAIN_ID },
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
          setAddress(accounts[0])
        } else {
          disconnectWallet();
        }
      };

      const onChainChangedHandler = async (chainIdHex: string) => {
        console.log('Event: chainChanged, new chainIdHex:', chainIdHex);
        const isSepoliaNetwork = chainIdHex === SEPOLIA_CHAIN_ID;
        setIsSepolia(isSepoliaNetwork);
        onNetworkChange?.(isSepoliaNetwork);
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
    <div className="mb-6">
      {!address && wallets ? (
        <div className="mb-6">
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
                  Make sure you have MetaMask installed and are connected to the Sepolia network
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
                <span>{loading ? 'Connecting...' : wallet.info.name}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
          <div>
            {!isSepolia ? ( 
              <div className="mb-6">
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
            <div>
              <div>
                <div className="items-center justify-between bg-gray-50 p-3 rounded-md">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center">
                      <div className="h-2 w-2 bg-green-500 rounded-full mr-2"></div>
                      <span className="text-xs text-gray-500">Connected Wallet</span>
                    </div>
                    <button
                      onClick={disconnectWallet}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between bg-gray-50 p-3 rounded-md mt-4">
                  <div className="flex flex-col">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">Wallet Address:</h3>
                    </div>
                    <div>
                      <span className="hidden sm:block text-sm text-gray-700 break-all">
                        {address}
                      </span>
                      <span className="block sm:hidden text-sm text-gray-700 break-all">
                        {address ? `${address.slice(0, 6)}...${address.slice(-12)}` : ''}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-gray-50 p-3 rounded-md mt-4">
                  <div className="flex flex-col">
                    <div className="mt-2 space-y-1">
                      <h3 className="text-lg font-medium text-gray-900">Balances:</h3>
                      <span className="text-sm text-gray-600">
                        ETH Balance: {parseFloat(ethBalance).toFixed(4)} ETH
                      </span>
                      <span className="text-sm text-gray-600 block">
                        WETH Balance: {parseFloat(wethBalance).toFixed(4)} WETH
                      </span>
                      <span className="text-sm text-gray-600 block">
                        GME Balance: {parseFloat(gmeBalance).toFixed(4)} GME
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      {error && (
        <div className="mt-2 text-sm text-red-600">
          {error}
        </div>
      )}
    </div>
  );
}