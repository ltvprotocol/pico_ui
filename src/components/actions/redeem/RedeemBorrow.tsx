import React, { useState } from 'react';
import { parseUnits } from 'ethers';
import { useAppContext, useVaultContext } from '@/contexts';
import { isUserRejected } from '@/utils';
import { useAdaptiveInterval } from '@/hooks';
import { ActionForm } from '@/components/ui';

export default function RedeemBorrow() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [amount, setAmount] = useState('');

  const { address, isConnected } = useAppContext();
  const { sharesSymbol, vault, decimals, maxRedeem, updateMaxRedeem } = useVaultContext()

  useAdaptiveInterval(updateMaxRedeem, {
    enabled: isConnected
  });

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!address || !vault) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const amountToRedeem = parseUnits(amount, decimals);
      const maxAvailable = parseUnits(maxRedeem, decimals);

      if (maxAvailable < amountToRedeem) {
        setError('Amount higher than available.');
        console.error('Amount higher than available');
        return;
      }

      const redeemTx = await vault.redeem(amountToRedeem, address, address);
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
    <ActionForm 
      actionTitle='Redeem'
      amount={amount}
      maxAmount={maxRedeem}
      tokenSymbol={sharesSymbol}
      isLoading={loading}
      error={error}
      success={success}
      setAmount={setAmount}
      handleSubmit={handleRedeem}
    />
  );
};