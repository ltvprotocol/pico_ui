import React, { useState } from 'react';
import { parseUnits } from 'ethers';
import { useAppContext, useVaultContext } from '@/contexts';
import { isUserRejected, wrapEth } from '@/utils';
import { ActionForm } from '@/components/ui';
import { isWETHAddress } from '@/constants';
import { WETH } from '@/typechain-types';
import { ActionType, TokenType } from '@/types/actions';

interface ActionConfig {
  needsApproval: boolean;
  usesShares: boolean;
}

const ACTION_CONFIGS: Record<ActionType, ActionConfig> = {
  deposit: { needsApproval: true, usesShares: false },
  mint: { needsApproval: true, usesShares: true },
  withdraw: { needsApproval: false, usesShares: false },
  redeem: { needsApproval: false, usesShares: true },
};

interface ActionHandlerProps {
  actionType: ActionType;
  tokenType: TokenType;
}

export default function ActionHandler({ actionType, tokenType }: ActionHandlerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [amount, setAmount] = useState('');

  const { publicProvider, address } = useAppContext();

  const config = ACTION_CONFIGS[actionType];
  const isBorrow = tokenType === 'borrow';

  const {
    vaultAddress,
    vault,
    vaultLens,
    sharesSymbol,
    sharesDecimals,
    borrowTokenSymbol,
    borrowTokenAddress,
    borrowToken,
    borrowTokenLens,
    borrowTokenDecimals,
    collateralTokenSymbol,
    collateralTokenAddress,
    collateralToken,
    collateralTokenLens,
    collateralTokenDecimals,
    maxDeposit,
    maxMint,
    maxWithdraw,
    maxRedeem,
    maxDepositCollateral,
    maxMintCollateral,
    maxWithdrawCollateral,
    maxRedeemCollateral,
  } = useVaultContext();

  const tokenSymbol = isBorrow ? borrowTokenSymbol : collateralTokenSymbol;
  const tokenAddress = isBorrow ? borrowTokenAddress : collateralTokenAddress;
  const token = isBorrow ? borrowToken : collateralToken;
  const tokenLens = isBorrow ? borrowTokenLens : collateralTokenLens;
  const tokenDecimals = isBorrow ? borrowTokenDecimals : collateralTokenDecimals;

  const getMaxAmount = () => {
    if (actionType === 'deposit') {
      return isBorrow ? maxDeposit : maxDepositCollateral;
    } else if (actionType === 'mint') {
      return isBorrow ? maxMint : maxMintCollateral;
    } else if (actionType === 'withdraw') {
      return isBorrow ? maxWithdraw : maxWithdrawCollateral;
    } else if (actionType === 'redeem') {
      return isBorrow ? maxRedeem : maxRedeemCollateral;
    }
    return '0';
  };

  const maxAmount = getMaxAmount();

  const displayTokenSymbol = config.usesShares ? sharesSymbol : tokenSymbol;
  const displayDecimals = config.usesShares ? sharesDecimals : tokenDecimals;

  const handleWrapIfNeeded = async (needed: bigint, balance: bigint): Promise<boolean> => {
    if (balance >= needed) return true;

    if (!isWETHAddress(tokenAddress)) {
      setError(`Not enough tokens to ${actionType}.`);
      console.error(`Not enough tokens to ${actionType}`);
      return false;
    }

    if (!publicProvider || !token) return false;

    const ethBalance = await publicProvider.getBalance(address!);
    const wethMissing = needed - balance;
    await wrapEth(token as WETH, wethMissing, ethBalance, setSuccess, setError);

    const newBalance = await tokenLens!.balanceOf(address!);
    if (newBalance < needed) {
      setError('Not enough WETH after wrapping.');
      console.error('Not enough WETH after wrapping');
      return false;
    }

    return true;
  };

  const handleApproval = async (needed: bigint): Promise<boolean> => {
    if (!token || !tokenLens || !address) return false;

    const currentAllowance = await tokenLens.allowance(address, vaultAddress);

    if (currentAllowance < needed) {
      const approveTx = await token.approve(vaultAddress, needed);
      await approveTx.wait();
      setSuccess(`Successfully approved ${tokenSymbol}.`);
    } else {
      setSuccess(`Already approved ${tokenSymbol}.`);
    }

    return true;
  };

  const executeVaultMethod = async (parsedAmount: bigint) => {
    if (!vault || !address) return;

    let tx;

    if (actionType === 'deposit') {
      tx = isBorrow 
        ? await vault.deposit(parsedAmount, address)
        : await vault.depositCollateral(parsedAmount, address);
    } else if (actionType === 'mint') {
      tx = isBorrow
        ? await vault.mint(parsedAmount, address)
        : await vault.mintCollateral(parsedAmount, address);
    } else if (actionType === 'withdraw') {
      tx = isBorrow
        ? await vault.withdraw(parsedAmount, address, address)
        : await vault.withdrawCollateral(parsedAmount, address, address);
    } else if (actionType === 'redeem') {
      tx = isBorrow
        ? await vault.redeem(parsedAmount, address, address)
        : await vault.redeemCollateral(parsedAmount, address, address);
    }

    await tx?.wait();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError(null);
    setSuccess(null);

    if (!vault || !address) return;

    try {
      const parsedAmount = parseUnits(amount, displayDecimals);

      if (config.needsApproval) {
        if (!publicProvider || !tokenLens || !token || !vaultLens) return;

        let tokensNeeded: bigint;

        if (config.usesShares) {
          // Mint: convert shares to tokens needed
          tokensNeeded = isBorrow
            ? await vaultLens.previewMint(parsedAmount)
            : await vaultLens.previewMintCollateral(parsedAmount);
        } else {
          // Deposit: amount is already in tokens
          tokensNeeded = parsedAmount;
        }

        const balance = await tokenLens.balanceOf(address);

        // Handle WETH wrapping if needed
        const hasEnough = await handleWrapIfNeeded(tokensNeeded, balance);
        if (!hasEnough) return;

        // Handle approval
        const approved = await handleApproval(tokensNeeded);
        if (!approved) return;
      } else if (actionType === 'redeem') {
        const maxAvailableParsed = parseUnits(maxAmount, displayDecimals);
        if (maxAvailableParsed < parsedAmount) {
          setError('Amount higher than available.');
          console.error('Amount higher than available');
          return;
        }
      }

      await executeVaultMethod(parsedAmount);

      setAmount('');
      setSuccess(`${actionType.charAt(0).toUpperCase() + actionType.slice(1)} successful!`);
    } catch (err) {
      if (isUserRejected(err)) {
        setError('Transaction canceled by user.');
      } else {
        setError(`Failed to ${actionType}.`);
        console.error(`Failed to ${actionType}: `, err);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ActionForm
      actionName={actionType.charAt(0).toUpperCase() + actionType.slice(1)}
      amount={amount}
      maxAmount={maxAmount}
      tokenSymbol={displayTokenSymbol || ''}
      isLoading={loading}
      error={error}
      success={success}
      setAmount={setAmount}
      handleSubmit={handleSubmit}
    />
  );
}

