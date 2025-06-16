import React, { useState } from 'react';
import { parseUnits } from 'ethers';
import { useAppContext, useVaultContext } from '@/contexts';
import { isUserRejected, allowOnlyNumbers, isButtonDisabled } from '@/utils';
import { useAdaptiveInterval } from '@/hooks';

export default function Withdraw() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [amount, setAmount] = useState('');

  const { 
    address, isConnected, vaultContract, wethContract, wethContractLens 
  } = useAppContext();

  const { decimals, maxWithdraw, updateMaxWithdraw } = useVaultContext();

  useAdaptiveInterval(updateMaxWithdraw, {
    enabled: isConnected
  });

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError(null);
    setSuccess(null);

    if (!wethContractLens || !wethContract || !vaultContract || !address) return;

    try {
      const amountToWithdraw = parseUnits(amount, decimals);

      const withdrawTx = await vaultContract.withdraw(amountToWithdraw, address, address);
      await withdrawTx.wait();

      setAmount('');
      setSuccess('Withdraw successful!');
    } catch (err) {
      if (isUserRejected(err)) {
        setError('Transaction canceled by user.');
      } else {
        setError('Failed to Withdraw.');
        console.error('Failed to Withdraw: ', err);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-8 p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-900">Withdraw Assets</h2>
      <form onSubmit={handleWithdraw} className="space-y-4">
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
            Amount to Withdraw
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
              max={maxWithdraw}
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <button
                type="button"
                onClick={() => setAmount(maxWithdraw)}
                className="text-sm text-indigo-600 hover:text-indigo-500 mr-2"
              >
                MAX
              </button>
              <span className="text-gray-500 sm:text-sm">WETH</span>
            </div>
          </div>
          <div className="mt-1 text-sm text-gray-500">
            Max Available: {!maxWithdraw ? 'Loading...' : `${maxWithdraw} WETH`}
          </div>
        </div>

        <button
          type="submit"
          disabled={isButtonDisabled(loading, amount, maxWithdraw)}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Withdraw'}
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