import React, { useState } from 'react';
import { formatUnits, parseUnits } from 'ethers';
import { GME_VAULT_ADDRESS } from '@/constants';
import { useAppContext } from '@/context/AppContext';
import { isUserRejected, allowOnlyNumbers } from '@/utils';
import { useAdaptiveInterval } from '@/hooks';

export default function Deposit() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [amount, setAmount] = useState('');
  const [success, setSuccess] = useState<string | null>(null);
  const [maxAvailableDeposit, setMaxAvailableDeposit] = useState<string>('0.0000');

  const [wethBalance, setWethBalance] = useState<bigint>(0n);
  const [wethDecimals, setWethDecimals] = useState<bigint>(18n);

  const { 
    publicProvider, address, isConnected, vaultContract, wethContract,
    vaultContractLens, wethContractLens 
  } = useAppContext();

  const getWethBalance = async () : Promise<bigint> => {
    const currentWethBalance = await wethContractLens!.balanceOf(address!);
    setWethBalance(currentWethBalance);
    return currentWethBalance;
  }

  const getWethDecimals = async () : Promise<bigint> => {
    const currentWethDecimals = await wethContractLens!.decimals();
    setWethDecimals(currentWethDecimals);
    return currentWethDecimals;
  }

  const updateMaxAvailableDeposit = async () => {
    if(!publicProvider && !address && !vaultContractLens && !wethContractLens) {
      console.error("Unable to call updateMaxAvailableDeposit");
      return;
    }

    const currentWethBalance = await getWethBalance();
    const currentWethDecimals = await getWethDecimals();

    const vaultMaxDeposit = await vaultContractLens!.maxDeposit(address!);
    const ethBalance = await publicProvider!.getBalance(address!);

    const wethAmount = parseFloat(formatUnits(currentWethBalance, currentWethDecimals));
    const ethAmount = parseFloat(formatUnits(ethBalance, currentWethDecimals));
    const maxDepAmount = parseFloat(formatUnits(vaultMaxDeposit, currentWethDecimals));

    const maxAvailable = Math.min(wethAmount + ethAmount, maxDepAmount);
    setMaxAvailableDeposit(maxAvailable.toFixed(4));
  };

  useAdaptiveInterval(updateMaxAvailableDeposit, {
    enabled: isConnected
  });

  const handleWrapEth = async () => {
    if (!wethContract) return;

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
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = allowOnlyNumbers(e.target.value);
    setAmount(value);
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (!wethContractLens && !wethContract && !vaultContract && !address) return;

    try {
      const amountWei = parseUnits(amount, wethDecimals);
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
      setSuccess('Successfully approved WETH');

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
              type="text"
              name="amount"
              id="amount"
              value={amount}
              onChange={handleInput}
              autoComplete="off"
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
          disabled={loading || !amount || parseFloat(amount) > parseFloat(maxAvailableDeposit) || parseFloat(amount) == 0}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Deposit'}
        </button>
      </form>
    </div>
  );
} 