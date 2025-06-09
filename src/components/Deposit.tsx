import { useState, useEffect } from 'react';
import { formatUnits, parseUnits } from 'ethers';
import { GME_VAULT_ADDRESS } from '@/constants';
import { useAppContext } from '@/context/AppContext';
import { isUserRejected } from '@/utils';

export default function Deposit() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [amount, setAmount] = useState('');
  const [success, setSuccess] = useState<string | null>(null);
  const [maxAvailableDeposit, setMaxAvailableDeposit] = useState<string>('0.0000');

  const [wethBalance, setWethBalance] = useState<bigint>(0n);
  const [wethDecimals, setWethDecimals] = useState<bigint>(18n);

  const { 
    publicProvider, address, vaultContract, wethContract,
    vaultContractLens, wethContractLens 
  } = useAppContext();

  const updateWethInfo = async () => {
    if(!wethContractLens) return;

    const currentWethBalance = await wethContractLens.balanceOf(address!);
    const currentWethDecimals = await wethContractLens.decimals();
    setWethBalance(currentWethBalance);
    setWethDecimals(currentWethDecimals);
  }

  useEffect(() => {
    updateWethInfo();
    const interval = setInterval(() => {
      updateWethInfo();
    }, 1000);
    return () => clearInterval(interval);
  }, [wethContractLens]);

  const updateMaxAvailableDeposit = async () => {
    if(publicProvider && address && vaultContractLens && wethContractLens) {
      const vaultMaxDeposit = await vaultContractLens!.maxDeposit(address!);
      const ethBalance = await publicProvider.getBalance(address);

      const wethAmount = parseFloat(formatUnits(wethBalance, wethDecimals));
      const ethAmount = parseFloat(formatUnits(ethBalance, wethDecimals));
      const maxDepAmount = parseFloat(formatUnits(vaultMaxDeposit, wethDecimals));

      const maxAvailable = Math.min(wethAmount + ethAmount, maxDepAmount);
      setMaxAvailableDeposit(maxAvailable.toFixed(4));
    }
  };

  useEffect(() => {
    updateMaxAvailableDeposit();
    const interval = setInterval(() => {
      updateMaxAvailableDeposit();
    }, 1000);
    return () => clearInterval(interval);
  }, [publicProvider, address, vaultContractLens, wethContractLens, wethBalance, wethDecimals]);

  const handleWrapEth = async () => {
    if (!wethContract) return;
    
    setLoading(true);
    setError(null);

    try {
      const wethAmount = parseUnits(amount, wethDecimals);
      const neededWeth = wethAmount - wethBalance;
      
      // Wrap the needed amount
      const wrapTx = await wethContract.deposit({ value: neededWeth });
      await wrapTx.wait();
      
      setSuccess('Successfully wrapped ETH to WETH');
    } catch (err) {
      if (isUserRejected(err)) {
        setError('Transaction canceled by user.');
      } else {
        setError('Failed to wrap ETH');
        console.error('Failed to wrap', err);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (!wethContractLens && !wethContract && !vaultContract && !address) return;

    try {
      const decimals = await wethContractLens!.decimals();
      setWethDecimals(decimals);
      const amountWei = parseUnits(amount, decimals);
      const currentWethBalance = await wethContractLens!.balanceOf(address!);

      // If not enough WETH, wrap ETH first
      if (currentWethBalance < amountWei) {
        await handleWrapEth();

        const newBalance = await wethContractLens!.balanceOf(address!);
        if (newBalance < amountWei) {
          throw new Error('Not enough WETH after wrapping');
        }
      }

      const approveTx = await wethContract!.approve(GME_VAULT_ADDRESS, amountWei);
      await approveTx.wait();

      const depositTx = await vaultContract!.deposit(amountWei, address!);
      await depositTx.wait();

      setAmount('');
      setSuccess('Deposit successful!');
    } catch (err) {
      if (isUserRejected(err)) {
        setError('Transaction canceled by user.');
      } else {
        setError('Failed to deposit');
        console.error('Failed to deposit', err);
      }
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