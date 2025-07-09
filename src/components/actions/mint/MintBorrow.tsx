import React, { useState } from 'react';
import { parseUnits } from 'ethers';
import { useAppContext, useVaultContext } from '@/contexts';
import { isUserRejected, wrapEth } from '@/utils';
import { useAdaptiveInterval } from '@/hooks';
import { ActionForm } from '@/components/ui';

export default function MintBorrow() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [amount, setAmount] = useState('');

  const { publicProvider, address, isConnected } = useAppContext();

  const {
    vaultAddress,
    sharesSymbol, borrowTokenSymbol,
    vault, borrowToken, vaultLens, borrowTokenLens,
    decimals, maxMint, updateMaxMint
  } = useVaultContext()

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
      !borrowTokenLens ||
      !borrowToken ||
      !vaultLens ||
      !vault
    ) return;

    try {
      const mintAmount = parseUnits(amount, decimals);
      const wethNeededToMint = await vaultLens.previewMint(mintAmount);
      const wethBalance = await borrowTokenLens.balanceOf(address);

      if (wethBalance < wethNeededToMint) {
        const ethBalance = await publicProvider.getBalance(address);
        const wethMissing = wethNeededToMint - wethBalance;
        await wrapEth(borrowToken, wethMissing, ethBalance, setSuccess, setError);

        const newWethBalance = await borrowTokenLens.balanceOf(address);
        if (newWethBalance < wethNeededToMint) {
          setError('Not enough WETH after wrapping.');
          console.error('Not enough WETH after wrapping');
          return;
        }
      }

      const approveTx = await borrowToken.approve(vaultAddress, wethNeededToMint);
      await approveTx.wait();
      setSuccess(`Successfully approved ${borrowTokenSymbol}.`);

      const mintTx = await vault.mint(mintAmount, address);
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
    <ActionForm 
      actionName='Mint'
      amount={amount}
      maxAmount={maxMint}
      tokenSymbol={sharesSymbol}
      isLoading={loading}
      error={error}
      success={success}
      setAmount={setAmount}
      handleSubmit={handleMint}
    />
  );
};