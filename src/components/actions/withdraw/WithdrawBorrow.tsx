import React, { useState } from 'react';
import { parseUnits } from 'ethers';
import { useAppContext, useVaultContext } from '@/contexts';
import { isUserRejected } from '@/utils';
import { useAdaptiveInterval } from '@/hooks';
import { ActionForm } from '@/components/ui';

export default function WithdrawBorrow() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [amount, setAmount] = useState('');

  const { address, isConnected } = useAppContext();
  const { borrowTokenSymbol, vault, decimals, maxWithdraw, updateMaxWithdraw } = useVaultContext();

  useAdaptiveInterval(updateMaxWithdraw, {
    enabled: isConnected
  });

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError(null);
    setSuccess(null);

    if (!vault || !address) return;

    try {
      const amountToWithdraw = parseUnits(amount, decimals);

      const withdrawTx = await vault.withdraw(amountToWithdraw, address, address);
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
    <ActionForm 
      actionName='Withdraw'
      amount={amount}
      maxAmount={maxWithdraw}
      tokenSymbol={borrowTokenSymbol}
      isLoading={loading}
      error={error}
      success={success}
      setAmount={setAmount}
      handleSubmit={handleWithdraw}
    />
  );
};