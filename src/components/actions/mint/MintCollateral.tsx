import React, { useState } from 'react';
import { parseUnits } from 'ethers';
import { VAULT_ADDRESS } from '@/constants';
import { useAppContext, useVaultContext } from '@/contexts';
import { isUserRejected } from '@/utils';
import { useAdaptiveInterval } from '@/hooks';
import { ActionForm } from '@/components/ui';

export default function MintCollateral() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [amount, setAmount] = useState('');

  const { publicProvider, address, isConnected } = useAppContext();

  const {
    sharesSymbol,
    vault, collateralToken, vaultLens, collateralTokenLens,
    decimals, maxMintCollateral, updateMaxMintCollateral
  } = useVaultContext()

  useAdaptiveInterval(updateMaxMintCollateral, {
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
      !collateralTokenLens ||
      !collateralToken ||
      !vaultLens ||
      !vault
    ) return;

    try {
      const mintAmount = parseUnits(amount, decimals);
      const neededToMint = await vaultLens.previewMintCollateral(mintAmount);
      const collateralBalance = await collateralTokenLens.balanceOf(address);

      if (collateralBalance < neededToMint) {
        setError('Not enough to mint.');
        console.error('Not enough to mint');
        return;
      }

      const approveTx = await collateralToken.approve(VAULT_ADDRESS, neededToMint);
      await approveTx.wait();
      setSuccess('Successfully approved WETH.');

      const mintTx = await vault.mintCollateral(mintAmount, address);
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
      actionTitle='Mint'
      amount={amount}
      maxAmount={maxMintCollateral}
      tokenSymbol={sharesSymbol}
      isLoading={loading}
      error={error}
      success={success}
      setAmount={setAmount}
      handleSubmit={handleMint}
    />
  );
};