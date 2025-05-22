import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

const GME_ADDRESS = '0xe2a7f267124ac3e4131f27b9159c78c521a44f3c';
const WETH_ADDRESS = '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14';

interface WalletConnectProps {
  onConnect?: (address: string | null) => void;
  onWethBalance?: (balance: ethers.BigNumber) => void;
  onEthBalance?: (balance: string) => void;
}

export default function WalletConnect({ onConnect, onWethBalance, onEthBalance }: WalletConnectProps) {
  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gmeBalance, setGmeBalance] = useState<string>('0');
  const [wethBalance, setWethBalance] = useState<string>('0');
  const [ethBalance, setEthBalance] = useState<string>('0');

  const getBalances = async (address: string) => {
    try {
      if (!window.ethereum) return;

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      
      // Get ETH balance
      const ethBalance = await provider.getBalance(address);
      const formattedEthBalance = ethers.utils.formatEther(ethBalance);
      setEthBalance(formattedEthBalance);
      onEthBalance?.(formattedEthBalance);

      // Get GME token balance
      const gmeContract = new ethers.Contract(
        GME_ADDRESS,
        [
          'function balanceOf(address owner) view returns (uint256)',
          'function decimals() view returns (uint8)',
          'function symbol() view returns (string)',
        ],
        provider
      );

      // Get WETH token balance
      const wethContract = new ethers.Contract(
        WETH_ADDRESS,
        [
          'function balanceOf(address) view returns (uint256)',
          'function decimals() view returns (uint8)',
        ],
        provider
      );

      const [gmeBalance, gmeDecimals, wethBalance, wethDecimals] = await Promise.all([
        gmeContract.balanceOf(address),
        gmeContract.decimals(),
        wethContract.balanceOf(address),
        wethContract.decimals()
      ]);

      const formattedGmeBalance = ethers.utils.formatUnits(gmeBalance, gmeDecimals);
      const formattedWethBalance = ethers.utils.formatUnits(wethBalance, wethDecimals);
      
      setGmeBalance(formattedGmeBalance);
      setWethBalance(formattedWethBalance);
      onWethBalance?.(wethBalance);
    } catch (err) {
      console.error('Error fetching balances:', err);
      setGmeBalance('0');
      setWethBalance('0');
      setEthBalance('0');
      onWethBalance?.(ethers.BigNumber.from(0));
      onEthBalance?.('0');
    }
  };

  const connectWallet = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!window.ethereum) {
        throw new Error('Please install MetaMask to use this feature');
      }

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = provider.getSigner();
      const address = await signer.getAddress();
      setAddress(address);
      onConnect?.(address);
      await getBalances(address);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setAddress(null);
      onConnect?.(null);
    } finally {
      setLoading(false);
    }
  };

  const disconnectWallet = () => {
    setAddress(null);
    onConnect?.(null);
    setGmeBalance('0');
    setWethBalance('0');
    setEthBalance('0');
  };

  const checkConnection = async () => {
    if (window.ethereum) {
      try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const currentAddress = await signer.getAddress();
        setAddress(currentAddress);
        onConnect?.(currentAddress);
        await getBalances(currentAddress);
      } catch (err) {
        // No account connected
        setAddress(null);
        onConnect?.(null);
        setGmeBalance('0');
        setWethBalance('0');
        setEthBalance('0');
      }
    }
  };

  useEffect(() => {
    checkConnection();

    // Listen for account changes
    if (window.ethereum) {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      window.ethereum.on('accountsChanged', async (accounts: string[]) => {
        if (accounts.length > 0) {
          try {
            const signer = provider.getSigner();
            const currentAddress = await signer.getAddress();
            setAddress(currentAddress);
            onConnect?.(currentAddress);
            await getBalances(currentAddress);
          } catch (err) {
            setAddress(null);
            onConnect?.(null);
            setGmeBalance('0');
            setWethBalance('0');
            setEthBalance('0');
          }
        } else {
          setAddress(null);
          onConnect?.(null);
          setGmeBalance('0');
          setWethBalance('0');
          setEthBalance('0');
        }
      });
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', () => {});
      }
    };
  }, []);

  return (
    <div className="mb-6">
      {!address ? (
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
          <button
            onClick={connectWallet}
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {loading ? 'Connecting...' : 'Connect Wallet'}
          </button>
        </div>
      ) : (
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
      )}
      {error && (
        <div className="mt-2 text-sm text-red-600">
          {error}
        </div>
      )}
    </div>
  );
} 