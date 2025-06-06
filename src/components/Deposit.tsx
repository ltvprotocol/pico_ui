import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { GME_VAULT_ADDRESS, WETH_ADDRESS } from '@/constants';
import { useAppContext } from '@/context/AppContext';

interface DepositProps {
  vaultMaxDeposit: string;
  ethBalance: string;
  wethBalance: string;
}

export default function Deposit({vaultMaxDeposit, ethBalance, wethBalance } : DepositProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [amount, setAmount] = useState('');
  const [success, setSuccess] = useState<string | null>(null);
  const [maxAvailableDeposit, setMaxAvailableDeposit] = useState<string>('0');
  const [wethDecimals, setWethDecimals] = useState<number>(18);

  const { provider, signer, address } = useAppContext();

  useEffect(() => {
    updateMaxAvailableDeposit(
      BigInt(wethBalance),
      BigInt(vaultMaxDeposit)
    );
  }, [wethBalance, vaultMaxDeposit, ethBalance]);

  const updateMaxAvailableDeposit = (wethBal: ethers.BigNumberish, maxDep: ethers.BigNumberish) => {
    const wethAmount = parseFloat(ethers.formatUnits(wethBal, wethDecimals));
    const ethAmount = parseFloat(ethBalance);
    const maxDepAmount = parseFloat(ethers.formatUnits(maxDep, wethDecimals));
    const maxAvailable = Math.min(wethAmount + ethAmount, maxDepAmount);
    setMaxAvailableDeposit(maxAvailable.toFixed(4));
  };

  const handleWrapEth = async () => {
    if (!provider || !address) return;
    
    setLoading(true);
    setError(null);

    try {
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
      const wethAmount = ethers.parseUnits(amount, wethDecimals);
      const currentWeth = BigInt(wethBalance);
      const neededWeth = wethAmount - BigInt(currentWeth);
      
      // Wrap the needed amount
      const wrapTx = await wethContract.deposit({ value: neededWeth });
      await wrapTx.wait();
      
      // Refresh balances
      //if (handleWethBalance) {
      //  const newBalance = await wethContract.balanceOf(address);
      //  handleWethBalance(newBalance);
      //}
      
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

    if (!provider || !address) return;

    try {
      const vaultContract = new ethers.Contract(
        GME_VAULT_ADDRESS,
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
      const amountWei = ethers.parseUnits(amount, decimals);
      const currentWethBalance = await wethContract.balanceOf(address);

      // If not enough WETH, wrap ETH first
      if (currentWethBalance < amountWei) {
        await handleWrapEth();
        // Wait for balance update
        const newBalance = await wethContract.balanceOf(address);
        if (newBalance < amountWei) {
          throw new Error('Not enough WETH after wrapping');
        }
      }

      // Approve vault to spend WETH
      const approveTx = await wethContract.approve(GME_VAULT_ADDRESS, amountWei);
      await approveTx.wait();

      // Deposit to vault
      const depositTx = await vaultContract.deposit(amountWei, address);
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
              disabled={loading}
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
          disabled={loading || !amount || parseFloat(amount) > parseFloat(maxAvailableDeposit)}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Deposit'}
        </button>
      </form>
    </div>
  );
} 