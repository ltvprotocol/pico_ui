import React from 'react';
import { isUserRejected } from './isUserRejected';
import { WETH } from '@/typechain-types';

export const wrapEth = async (
  wethContract: WETH,
  needed: bigint,
  ethBalance: bigint,
  setSuccess: React.Dispatch<React.SetStateAction<string | null>>,
  setError: React.Dispatch<React.SetStateAction<string | null>>
): Promise<void> => {
  
  if (!wethContract) {
    setError('Error trying to wrap ETH.');
    console.error('Unable to call wrapEth without wethContract');
    return;
  };

  if (needed >= ethBalance) {
    setError('Unable to wrap ETH, insufficient balance. Please top up your balance first!');
    console.error('Unable to wrap, reason: insufficient balance');
    return;
  }

  setError(null);

  try {
    const tx = await wethContract.deposit({ value: needed });
    await tx.wait();
    setSuccess('Successfully wrapped ETH to WETH!');
  } catch (err) {
    if (isUserRejected(err)) {
      setError('Transaction canceled by user.');
    } else {
      setError('Failed to wrap ETH.');
      console.error('Unknown error wraping ETH: ', err);
    }
  }
};