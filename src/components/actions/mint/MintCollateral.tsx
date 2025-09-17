import React, { useState } from 'react';
import { parseUnits } from 'ethers';
import { useAppContext, useVaultContext } from '@/contexts';
import { isUserRejected, wrapEth } from '@/utils';
import { ActionForm } from '@/components/ui';
import { WETH } from '@/typechain-types';
import { WETH_ADDRESS } from '@/constants';

export default function MintCollateral() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [amount, setAmount] = useState('');

  const { publicProvider, address } = useAppContext();

  const {
    vaultAddress,
    sharesSymbol, collateralTokenSymbol, collateralTokenAddress,
    vault, collateralToken, vaultLens, collateralTokenLens,
    decimals, maxMintCollateral
  } = useVaultContext()

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
      const tokensNeededToMint = await vaultLens.previewMintCollateral(mintAmount);
      const balance = await collateralTokenLens.balanceOf(address);

      if (balance < tokensNeededToMint) {
        if (collateralTokenAddress === WETH_ADDRESS) {
          const ethBalance = await publicProvider.getBalance(address);
          const wethMissing = tokensNeededToMint - balance;
          await wrapEth(collateralToken as WETH, wethMissing, ethBalance, setSuccess, setError);

          const newBalance = await collateralTokenLens.balanceOf(address);
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

      const approveTx = await collateralToken.approve(vaultAddress, tokensNeededToMint);
      await approveTx.wait();
      setSuccess(`Successfully approved ${collateralTokenSymbol}.`);

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
      actionName='Mint'
      amount={amount}
      maxAmount={maxMintCollateral}
      tokenSymbol={sharesSymbol || ''}
      isLoading={loading}
      error={error}
      success={success}
      setAmount={setAmount}
      handleSubmit={handleMint}
    />
  );
};