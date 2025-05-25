import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import WalletConnect from './WalletConnect';
import VaultInfo from './VaultInfo';

const TOKEN_ADDRESS = '0xe2a7f267124ac3e4131f27b9159c78c521a44f3c';
const WETH_ADDRESS = '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14';

interface DepositProps {
  isWalletConnected: boolean;
  isSepolia: boolean;
  walletAddress: string | null;
  vaultMaxDeposit: string;
  ethBalance: string;
  wethBalance: string;
  handleEthBalance: (balance: string) => void;
  handleWethBalance: (balance: ethers.BigNumber) => void;
}

export default function Deposit({
  isWalletConnected,
  isSepolia,
  walletAddress,
  vaultMaxDeposit,
  ethBalance,
  wethBalance,
  handleEthBalance,
  handleWethBalance,
}: DepositProps) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [maxAvailableDeposit, setMaxAvailableDeposit] = useState<string>('0');
  const [wethDecimals, setWethDecimals] = useState<number>(18);

  const handleWalletConnect = (address: string | null) => {
    // This function is no longer used in the new version
  };

  const handleNetworkChange = (isSepoliaNetwork: boolean) => {
    // This function is no longer used in the new version
  };

  const handleVaultInfo = (maxDeposit: ethers.BigNumber) => {
    // This function is no longer used in the new version
  };

  useEffect(() => {
    updateMaxAvailableDeposit(
      ethers.BigNumber.from(wethBalance),
      ethers.BigNumber.from(vaultMaxDeposit)
    );
  }, [wethBalance, vaultMaxDeposit, ethBalance]);

  const updateMaxAvailableDeposit = (wethBal: ethers.BigNumber, maxDep: ethers.BigNumber) => {
    const wethAmount = parseFloat(ethers.utils.formatUnits(wethBal, wethDecimals));
    const ethAmount = parseFloat(ethBalance);
    const maxDepAmount = parseFloat(ethers.utils.formatUnits(maxDep, wethDecimals));
    const maxAvailable = Math.min(wethAmount + ethAmount, maxDepAmount);
    setMaxAvailableDeposit(maxAvailable.toFixed(4));
  };

  const handleWrapEth = async () => {
    if (!window.ethereum || !walletAddress) return;
    
    setLoading(true);
    setError(null);
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      
      const wethContract = new ethers.Contract(
        WETH_ADDRESS,
        [
          'function deposit() payable',
          'function decimals() view returns (uint8)',
          'function balanceOf(address) view returns (uint256)',
        ],
        signer
      );

      // Get the amount needed to wrap
      const wethAmount = ethers.utils.parseUnits(amount, wethDecimals);
      const currentWeth = ethers.BigNumber.from(wethBalance);
      const neededWeth = wethAmount.sub(currentWeth);
      
      // Wrap the needed amount
      const wrapTx = await wethContract.deposit({ value: neededWeth });
      await wrapTx.wait();
      
      // Refresh balances
      if (handleWethBalance) {
        const newBalance = await wethContract.balanceOf(walletAddress);
        handleWethBalance(newBalance);
      }
      
      setSuccess('Successfully wrapped ETH to WETH');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to wrap ETH');
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (!window.ethereum) {
        throw new Error('Please install MetaMask to use this feature');
      }

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      
      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' });

      // Create contract instances
      const vaultContract = new ethers.Contract(
        TOKEN_ADDRESS,
        [
          'function deposit(uint256 assets, address receiver) returns (uint256)',
          'function asset() view returns (address)',
        ],
        signer
      );

      const wethContract = new ethers.Contract(
        WETH_ADDRESS,
        [
          'function approve(address spender, uint256 amount) returns (bool)',
          'function decimals() view returns (uint8)',
          'function balanceOf(address) view returns (uint256)',
        ],
        signer
      );

      // Get WETH decimals and check balance
      const decimals = await wethContract.decimals();
      setWethDecimals(decimals);
      const amountWei = ethers.utils.parseUnits(amount, decimals);
      const currentWethBalance = await wethContract.balanceOf(await signer.getAddress());

      // If not enough WETH, wrap ETH first
      if (currentWethBalance.lt(amountWei)) {
        await handleWrapEth();
        // Wait for balance update
        const newBalance = await wethContract.balanceOf(await signer.getAddress());
        if (newBalance.lt(amountWei)) {
          throw new Error('Not enough WETH after wrapping');
        }
      }

      // Approve vault to spend WETH
      const approveTx = await wethContract.approve(TOKEN_ADDRESS, amountWei);
      await approveTx.wait();

      // Deposit to vault
      const depositTx = await vaultContract.deposit(amountWei, await signer.getAddress());
      await depositTx.wait();

      setAmount('');
      setSuccess('Deposit successful!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {isWalletConnected && isSepolia && (
        <div className="mt-8 p-6 bg-white rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold mb-6 text-gray-900">Deposit Assets</h2>
          <form onSubmit={handleDeposit} className="space-y-4">
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
                Amount to Deposit
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <input
                  type="number"
                  name="amount"
                  id="amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="block w-full pr-24 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="0.0"
                  step="any"
                  required
                  disabled={!isWalletConnected || loading}
                  max={maxAvailableDeposit}
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <button
                    type="button"
                    onClick={() => setAmount(maxAvailableDeposit)}
                    className="text-sm text-indigo-600 hover:text-indigo-500 mr-2"
                  >
                    MAX
                  </button>
                  <span className="text-gray-500 sm:text-sm">WETH</span>
                </div>
              </div>
              <div className="mt-1 text-sm text-gray-500">
                Max Available: {maxAvailableDeposit} WETH
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-600">
                {error}
              </div>
            )}

            {success && (
              <div className="text-sm text-green-600">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={!isWalletConnected || loading || !amount || parseFloat(amount) > parseFloat(maxAvailableDeposit)}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Deposit'}
            </button>
          </form>
        </div>
      )}
    </>
  );
} 