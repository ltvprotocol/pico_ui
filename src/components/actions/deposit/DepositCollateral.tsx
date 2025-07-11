import React, { useState } from 'react';
import { parseUnits } from 'ethers';
import { useAppContext } from '@/contexts';
import { isUserRejected, wrapEth } from '@/utils';
import { useAdaptiveInterval } from '@/hooks';
import { useVaultContext } from '@/contexts/VaultContext';
import { ActionForm } from '@/components/ui';
import { WETH_ADDRESS } from '@/constants';
import { WETH } from '@/typechain-types';

export default function DepositCollateral() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [amount, setAmount] = useState('');

  const { publicProvider, address, isConnected } = useAppContext();

  const {
    vaultAddress,
    collateralTokenSymbol, collateralTokenAddress,
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
      const balance = await collateralTokenLens.balanceOf(address);

      if (balance < neededToDeposit) {
        if (collateralTokenAddress === WETH_ADDRESS) {
          const ethBalance = await publicProvider.getBalance(address);
          const wethMissing = neededToDeposit - balance;
          await wrapEth(collateralToken as WETH, wethMissing, ethBalance, setSuccess, setError);

          const newBalance = await collateralTokenLens.balanceOf(address);
          if (newBalance < neededToDeposit) {
            setError('Not enough WETH after wrapping.');
            console.error('Not enough WETH after wrapping');
            return;
          }
        } else {
          setError('Not enough tokens to deposit.');
          console.error('Not enough tokens to deposit');
          return;
        }
      }

      const approveTx = await collateralToken.approve(vaultAddress, neededToDeposit);
      await approveTx.wait();
      setSuccess(`Successfully approved ${collateralTokenSymbol}.`);

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
      actionName='Deposit'
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