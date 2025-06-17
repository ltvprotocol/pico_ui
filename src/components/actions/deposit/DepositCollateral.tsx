import React, { useState } from 'react';
import { parseUnits } from 'ethers';
import { VAULT_ADDRESS } from '@/constants';
import { useAppContext } from '@/contexts';
import { isUserRejected } from '@/utils';
import { useAdaptiveInterval } from '@/hooks';
import { useVaultContext } from '@/contexts/VaultContext';
import { ActionForm } from '@/components/ui';

export default function DepositCollateral() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [amount, setAmount] = useState('');

  const { publicProvider, address, isConnected } = useAppContext();

  const {
    collateralTokenSymbol,
    vault, collateralToken, collateralTokenLens, 
    decimals, maxDepositCollateral, updateMaxDepositCollateral
  } = useVaultContext();

  useAdaptiveInterval(updateMaxDepositCollateral, {
    enabled: isConnected
  });

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError(null);
    setSuccess(null);

    if (!publicProvider || !collateralTokenLens || !collateralToken || !vault || !address) return;

    try {
      const neededToDeposit = parseUnits(amount, decimals);
      const collateralBalance = await collateralTokenLens.balanceOf(address);

      if (collateralBalance < neededToDeposit) {
        setError('Not enough tokens to deposit.');
        console.error('Not enough WETH after wrapping');
        return;
      }

      const approveTx = await collateralToken.approve(VAULT_ADDRESS, neededToDeposit);
      await approveTx.wait();
      setSuccess('Successfully approved WETH');

      const depositTx = await vault.depositCollateral(neededToDeposit, address);
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
    <ActionForm 
      actionTitle='Deposit'
      amount={amount}
      maxAmount={maxDepositCollateral}
      tokenSymbol={collateralTokenSymbol}
      isLoading={loading}
      error={error}
      success={success}
      setAmount={setAmount}
      handleSubmit={handleDeposit}
    />
  );
};