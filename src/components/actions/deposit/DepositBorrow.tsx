import React, { useState } from 'react';
import { parseUnits } from 'ethers';
import { VAULT_ADDRESS } from '@/constants';
import { useAppContext } from '@/contexts';
import { isUserRejected, wrapEth } from '@/utils';
import { useAdaptiveInterval } from '@/hooks';
import { useVaultContext } from '@/contexts/VaultContext';
import { ActionForm } from '@/components/ui';

export default function DepositBorrow() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [amount, setAmount] = useState('');

  const { publicProvider, address, isConnected} = useAppContext();

  const {
    borrowTokenSymbol,
    vault, borrowToken, borrowTokenLens, 
    decimals, maxDeposit, updateMaxDeposit
  } = useVaultContext()

  useAdaptiveInterval(updateMaxDeposit, {
    enabled: isConnected
  });

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError(null);
    setSuccess(null);

    if (!publicProvider || !borrowTokenLens || !borrowToken || !vault || !address) return;

    try {
      const wethNeededToDeposit = parseUnits(amount, decimals);
      const wethBalance = await borrowTokenLens.balanceOf(address);

      if (wethBalance < wethNeededToDeposit) {
        const ethBalance = await publicProvider.getBalance(address);
        const wethMissing = wethNeededToDeposit - wethBalance;
        await wrapEth(borrowToken, wethMissing, ethBalance, setSuccess, setError);

        const newWethBalance = await borrowTokenLens.balanceOf(address);
        if (newWethBalance < wethNeededToDeposit) {
          setError('Not enough WETH after wrapping.');
          console.error('Not enough WETH after wrapping');
          return;
        }
      }

      const approveTx = await borrowToken.approve(VAULT_ADDRESS, wethNeededToDeposit);
      await approveTx.wait();
      setSuccess('Successfully approved WETH');

      const depositTx = await vault.deposit(wethNeededToDeposit, address!);
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
      maxAmount={maxDeposit}
      tokenSymbol={borrowTokenSymbol}
      isLoading={loading}
      error={error}
      success={success}
      setAmount={setAmount}
      handleSubmit={handleDeposit}
    />
  );
};