import React, { useCallback, useState } from 'react';
import { formatUnits, parseUnits } from 'ethers';
import { useAppContext } from '@/context/AppContext';
import { isUserRejected, allowOnlyNumbers, isButtonDisabled } from '@/utils';
import { useAdaptiveInterval } from '@/hooks';

export default function Redeem() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [amount, setAmount] = useState('');
  const [success, setSuccess] = useState<string | null>(null);
  const [maxAvailableRedeem, setMaxAvailableRedeem] = useState<string>('');

  const [wethDecimals, setWethDecimals] = useState<bigint>(18n);

  const {
    address, isConnected, 
    vaultContract, vaultContractLens, wethContractLens 
  } = useAppContext();

  const getWethDecimals = useCallback(async (): Promise<bigint> => {
    if (!wethContractLens) {
      throw new Error('wethContractLens is not available');
    }
    
    const currentWethDecimals = await wethContractLens.decimals();
    setWethDecimals(currentWethDecimals);
    return currentWethDecimals;
  }, [wethContractLens]);

  const updateMaxAvailableRedeem = useCallback(async () => {
    if(!address || !vaultContractLens || !getWethDecimals) {
      console.error("Unable to call updateMaxAvailableRedeem");
      return;
    }

    const gmeBalance = await vaultContractLens.balanceOf(address!);
    const currentWethDecimals = await getWethDecimals();
    const vaultMaxRedeem = await vaultContractLens.maxRedeem(address!);

    const gmeAmount = parseFloat(formatUnits(gmeBalance, currentWethDecimals));
    const maxRedeemAmount = parseFloat(formatUnits(vaultMaxRedeem, currentWethDecimals));

    const maxAvailable = Math.min(gmeAmount, maxRedeemAmount);
    console.log("Redeem", maxAvailable);
    const truncated = Math.floor(maxAvailable * 10_000) / 10_000;
    setMaxAvailableRedeem(truncated.toFixed(4));
  }, [address, vaultContractLens, getWethDecimals]);

  useAdaptiveInterval(updateMaxAvailableRedeem, {
    enabled: isConnected
  });

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!address || !vaultContract || !wethContractLens) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const amountToRedeem = parseUnits(amount, wethDecimals);
      const maxAvailable = parseUnits(maxAvailableRedeem, wethDecimals);

      if (maxAvailable < amountToRedeem) {
        setError('Amount higher than available.');
        console.error('Amount higher than available');
        return;
      }

      const redeemTx = await vaultContract.redeem(amountToRedeem, address, address);
      await redeemTx.wait();

      setAmount('');
      setSuccess('Redemption successful!');
    } catch (err) {
      if (isUserRejected(err)) {
        setError('Transaction canceled by user.');
      } else {
        setError('Failed to redeem');
        console.error('Failed to redeem', err);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-8 p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-900">Redeem Assets</h2>
      <form onSubmit={handleRedeem} className="space-y-4">
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
            Amount to Redeem
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <input
              type="text"
              name="amount"
              id="amount"
              value={amount}
              onChange={(e) => setAmount(allowOnlyNumbers(e.target.value))}
              className="block w-full pr-24 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="0.0"
              step="any"
              required
              disabled={loading}
              max={maxAvailableRedeem}
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <button
                type="button"
                onClick={() => setAmount(maxAvailableRedeem)}
                className="text-indigo-600 hover:text-indigo-500 text-sm font-medium mr-2"
              >
                MAX
              </button>
              <span className="text-gray-500 sm:text-sm">GME</span>
            </div>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Max Available: {!maxAvailableRedeem ? 'Loading...' : `${maxAvailableRedeem} GME`}
          </p>
        </div>

        <button
          type="submit"
          disabled={isButtonDisabled(loading, amount, maxAvailableRedeem)}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Redeem'}
        </button>

        {error && (
          <div className="mt-2 text-sm text-red-600">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-2 text-sm text-green-600">
            {success}
          </div>
        )}
      </form>
    </div>
  );
}