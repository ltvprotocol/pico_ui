import React, { useState } from 'react';
import { parseUnits } from 'ethers';
import { GME_VAULT_ADDRESS } from '@/constants';
import { useAppContext, useVaultContext } from '@/contexts';
import { isUserRejected, allowOnlyNumbers, wrapEth, isButtonDisabled } from '@/utils';
import { useAdaptiveInterval } from '@/hooks';

export default function Mint() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [amount, setAmount] = useState('');

  const { 
    publicProvider, address, isConnected, vaultContract, wethContract,
    vaultContractLens, wethContractLens 
  } = useAppContext();

  const { decimals, maxMint, updateMaxMint } = useVaultContext();

  useAdaptiveInterval(updateMaxMint, {
    enabled: isConnected
  });

  const handleMint = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError(null);
    setSuccess(null);

    if (
      !publicProvider ||
      !address ||
      !wethContractLens ||
      !wethContract ||
      !vaultContractLens ||
      !vaultContract
    ) return;

    try {
      const mintAmount = parseUnits(amount, decimals);
      const wethNeededToMint = await vaultContractLens.previewMint(mintAmount);
      const wethBalance = await wethContractLens.balanceOf(address);

      if (wethBalance < wethNeededToMint) {
        const ethBalance = await publicProvider.getBalance(address);
        const wethMissing = wethNeededToMint - wethBalance;
        await wrapEth(wethContract, wethMissing, ethBalance, setSuccess, setError);

        const newWethBalance = await wethContractLens.balanceOf(address);
        if (newWethBalance < wethNeededToMint) {
          setError('Not enough WETH after wrapping.');
          console.error('Not enough WETH after wrapping');
          return;
        }
      }

      const approveTx = await wethContract.approve(GME_VAULT_ADDRESS, wethNeededToMint);
      await approveTx.wait();
      setSuccess('Successfully approved WETH.');

      const mintTx = await vaultContract.mint(mintAmount, address);
      await mintTx.wait();

      setAmount('');
      setSuccess('Mint successful!');
    } catch (err) {
      if (isUserRejected(err)) {
        setError('Transaction canceled by user.');
      } else {
        setError('Failed to mint.');
        console.error('Failed to mint: ', err);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-8 p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-900">Mint Assets</h2>
      <form onSubmit={handleMint} className="space-y-4">
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
            Amount to Mint
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
              max={maxMint}
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <button
                type="button"
                onClick={() => setAmount(maxMint)}
                className="text-sm text-indigo-600 hover:text-indigo-500 mr-2"
              >
                MAX
              </button>
              <span className="text-gray-500 sm:text-sm">GME</span>
            </div>
          </div>
          <div className="mt-1 text-sm text-gray-500">
            Max Available: {!maxMint ? 'Loading...' : `${maxMint} GME`}
          </div>
        </div>

        <button
          type="submit"
          disabled={isButtonDisabled(loading, amount, maxMint)}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Mint'}
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