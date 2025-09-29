import React, { useState } from 'react';
import { parseUnits } from 'ethers';
import { useAppContext, useVaultContext } from '@/contexts';
import { isUserRejected, wrapEth } from '@/utils';
import { ActionForm } from '@/components/ui';
import { isWETHAddress } from '@/constants';
import { WETH } from '@/typechain-types';

export default function MintBorrow() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [amount, setAmount] = useState('');

  const { publicProvider, address } = useAppContext();

  const {
    vaultAddress,
    sharesSymbol, borrowTokenSymbol, borrowTokenAddress,
    vault, borrowToken, vaultLens, borrowTokenLens,
    sharesDecimals, maxMint
  } = useVaultContext();

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
      const mintAmount = parseUnits(amount, sharesDecimals);
      const tokensNeededToMint = await vaultLens.previewMint(mintAmount);
      const balance = await borrowTokenLens.balanceOf(address);

      if (balance < tokensNeededToMint) {
        if (isWETHAddress(borrowTokenAddress)) {
          const ethBalance = await publicProvider.getBalance(address);
          const wethMissing = tokensNeededToMint - balance;
          await wrapEth(borrowToken as WETH, wethMissing, ethBalance, setSuccess, setError);

          const newBalance = await borrowTokenLens.balanceOf(address);
          if (newBalance < tokensNeededToMint) {
            setError('Not enough WETH after wrapping.');
            console.error('Not enough WETH after wrapping');
            return;
          }
        } else {
          setError('Not enough tokens to mint.');
          console.error('Not enough tokens to mint');
          return;
        }
      }

      const currentAllowance = await borrowTokenLens.allowance(address, vaultAddress);
      
      if (currentAllowance < tokensNeededToMint) {
        const approveTx = await borrowToken.approve(vaultAddress, tokensNeededToMint);
        await approveTx.wait();
        setSuccess(`Successfully approved ${borrowTokenSymbol}.`);
      } else {
        setSuccess(`Already approved ${borrowTokenSymbol}.`);
      }

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
      tokenSymbol={sharesSymbol || ''}
      isLoading={loading}
      error={error}
      success={success}
      setAmount={setAmount}
      handleSubmit={handleMint}
    />
  );
};