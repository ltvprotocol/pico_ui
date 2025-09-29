import React, { useState } from 'react';
import { parseUnits } from 'ethers';
import { useAppContext } from '@/contexts';
import { isUserRejected, wrapEth } from '@/utils';
import { useVaultContext } from '@/contexts/VaultContext';
import { ActionForm } from '@/components/ui';
import { isWETHAddress } from '@/constants';
import { WETH } from '@/typechain-types';

export default function DepositBorrow() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [amount, setAmount] = useState('');

  const { publicProvider, address } = useAppContext();

  const {
    vaultAddress,
    borrowTokenSymbol, borrowTokenAddress,
    vault, borrowToken, borrowTokenLens,
    borrowTokenDecimals, maxDeposit
  } = useVaultContext()

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError(null);
    setSuccess(null);

    if (!publicProvider || !borrowTokenLens || !borrowToken || !vault || !address) return;

    try {
      const neededToDeposit = parseUnits(amount, borrowTokenDecimals);
      const balance = await borrowTokenLens.balanceOf(address);

      if (balance < neededToDeposit) {
        if (isWETHAddress(borrowTokenAddress)) {
          const ethBalance = await publicProvider.getBalance(address);
          const wethMissing = neededToDeposit - balance;
          await wrapEth(borrowToken as WETH, wethMissing, ethBalance, setSuccess, setError);

          const newBalance = await borrowTokenLens.balanceOf(address);
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

      const approveTx = await borrowToken.approve(vaultAddress, neededToDeposit);
      await approveTx.wait();
      setSuccess(`Successfully approved ${borrowTokenSymbol}.`);

      const depositTx = await vault.deposit(neededToDeposit, address);
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
      maxAmount={maxDeposit}
      tokenSymbol={borrowTokenSymbol || ''}
      isLoading={loading}
      error={error}
      success={success}
      setAmount={setAmount}
      handleSubmit={handleDeposit}
    />
  );
};