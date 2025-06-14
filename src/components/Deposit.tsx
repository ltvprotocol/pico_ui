import React, { useState } from 'react';
import { parseUnits } from 'ethers';
import { GME_VAULT_ADDRESS } from '@/constants';
import { useAppContext } from '@/contexts';
import { isUserRejected, allowOnlyNumbers, wrapEth, isButtonDisabled } from '@/utils';
import { useAdaptiveInterval } from '@/hooks';
import { useVaultContext } from '@/contexts/VaultContext';

export default function Deposit() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [amount, setAmount] = useState('');

  const { 
    publicProvider, address, isConnected, vaultContract, wethContract, wethContractLens 
  } = useAppContext();

  const {decimals, maxDeposit, updateMaxDeposit} = useVaultContext()

  useAdaptiveInterval(updateMaxDeposit, {
    enabled: isConnected
  });

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError(null);
    setSuccess(null);

    if (!publicProvider || !wethContractLens || !wethContract || !vaultContract || !address) return;

    try {
      const wethNeededToDeposit = parseUnits(amount, decimals);
      const wethBalance = await wethContractLens.balanceOf(address);

      if (wethBalance < wethNeededToDeposit) {
        const ethBalance = await publicProvider.getBalance(address);
        const wethMissing = wethNeededToDeposit - wethBalance;
        await wrapEth(wethContract, wethMissing, ethBalance, setSuccess, setError);

        const newWethBalance = await wethContractLens.balanceOf(address);
        if (newWethBalance < wethNeededToDeposit) {
          setError('Not enough WETH after wrapping.');
          console.error('Not enough WETH after wrapping');
          return;
        }
      }

      const approveTx = await wethContract!.approve(GME_VAULT_ADDRESS, wethNeededToDeposit);
      await approveTx.wait();
      setSuccess('Successfully approved WETH');

      const depositTx = await vaultContract!.deposit(wethNeededToDeposit, address!);
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
              onChange={(e) => setAmount(allowOnlyNumbers(e.target.value))}
              autoComplete="off"
              className="block w-full pr-24 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="0.0"
              step="any"
              required
              disabled={loading}
              max={maxDeposit}
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <button
                type="button"
                onClick={() => setAmount(maxDeposit)}
                className="text-sm text-indigo-600 hover:text-indigo-500 mr-2"
              >
                MAX
              </button>
              <span className="text-gray-500 sm:text-sm">WETH</span>
            </div>
          </div>
          <div className="mt-1 text-sm text-gray-500">
            Max Available: {!maxDeposit ? 'Loading...' : `${maxDeposit} WETH`}
          </div>
        </div>

        <button
          type="submit"
          disabled={isButtonDisabled(loading, amount, maxDeposit)}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Deposit'}
        </button>

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
      </form>
    </div>
  );
}