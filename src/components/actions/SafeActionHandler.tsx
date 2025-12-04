import React, { useState, useEffect } from 'react';
import { parseUnits } from 'ethers';
import { useAppContext, useVaultContext } from '@/contexts';
import { isUserRejected, wrapEth, formatTokenSymbol } from '@/utils';
import { ActionForm, PreviewBox } from '@/components/ui';
import { isWETHAddress } from '@/constants';
import { WETH } from '@/typechain-types';
import { ActionType, TokenType } from '@/types/actions';
import { useActionPreview } from '@/hooks';

interface SafeActionConfig {
  needsApproval: boolean;
  usesShares: boolean;
}

const SAFE_ACTION_CONFIGS: Record<ActionType, SafeActionConfig> = {
  deposit: { needsApproval: true, usesShares: false },
  mint: { needsApproval: true, usesShares: true },
  withdraw: { needsApproval: true, usesShares: false },
  redeem: { needsApproval: true, usesShares: true },
};

interface SafeActionHandlerProps {
  actionType: ActionType;
  tokenType: TokenType;
}

export default function SafeActionHandler({ actionType, tokenType }: SafeActionHandlerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const DEFAULT_SLIPPAGE = '0.5';
  const [slippageTolerance, setSlippageTolerance] = useState(DEFAULT_SLIPPAGE);
  const [useDefaultSlippage, setUseDefaultSlippage] = useState(true);
  const [isMaxSelected, setIsMaxSelected] = useState(false);

  const { publicProvider, address, safeHelperAddressBorrow, safeHelperAddressCollateral, safeHelperBorrow, safeHelperCollateral, currentNetwork } = useAppContext();

  useEffect(() => {
    setAmount('');
    setError(null);
    setSuccess(null);
    // reset slippage to default when action/token changes and default is enabled
    if (useDefaultSlippage) {
      setSlippageTolerance(DEFAULT_SLIPPAGE);
    }
  }, [tokenType, actionType]);

  const config = SAFE_ACTION_CONFIGS[actionType];
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
    refreshBalances,
    refreshVaultLimits,
  } = useVaultContext();

  const tokenSymbol = isBorrow ? borrowTokenSymbol : collateralTokenSymbol;
  const tokenAddress = isBorrow ? borrowTokenAddress : collateralTokenAddress;
  const token = isBorrow ? borrowToken : collateralToken;
  const tokenLens = isBorrow ? borrowTokenLens : collateralTokenLens;
  const tokenDecimals = isBorrow ? borrowTokenDecimals : collateralTokenDecimals;

  const helperAddress = isBorrow ? safeHelperAddressBorrow : safeHelperAddressCollateral;

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

  const displayTokenSymbol = config.usesShares ? sharesSymbol : formatTokenSymbol(tokenSymbol);
  const displayDecimals = config.usesShares ? sharesDecimals : tokenDecimals;

  const { isLoadingPreview, previewData, receive, provide } = useActionPreview({
    amount,
    actionType,
    tokenType,
    vaultLens,
    displayDecimals,
    isBorrow,
  });

  const handleWrapIfNeeded = async (needed: bigint, balance: bigint): Promise<boolean> => {
    if (balance >= needed) return true;


    if (!currentNetwork) {
      setError('Wrong network.');
      console.error('Wrong network.');
      return false;
    }

    if (!isWETHAddress(tokenAddress, currentNetwork)) {
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

  const handleApproval = async (needed: bigint, approveShares: boolean = false): Promise<boolean> => {
    if (!address || !helperAddress) return false;

    if (approveShares) {
      if (!vault || !vaultLens) return false;
      
      const currentAllowance = await vaultLens.allowance(address, helperAddress);
      
      if (currentAllowance < needed) {
        const approveTx = await vault.approve(helperAddress, needed);
        await approveTx.wait();
        setSuccess(`Successfully approved ${sharesSymbol}.`);
      } else {
        setSuccess(`Already approved ${sharesSymbol}.`);
      }
    } else {
      if (!token || !tokenLens) return false;
      
      const currentAllowance = await tokenLens.allowance(address, helperAddress);

      if (currentAllowance < needed) {
        const approveTx = await token.approve(helperAddress, needed);
        await approveTx.wait();
        setSuccess(`Successfully approved ${tokenSymbol} for Safe Helper.`);
      } else {
        setSuccess(`Already approved ${tokenSymbol}.`);
      }
    }

    return true;
  };

  const calculateSlippageBound = async (parsedAmount: bigint): Promise<bigint | null> => {
    if (!vaultLens || !helperAddress) return null;

    const slippagePercent = parseFloat(slippageTolerance);
    if (isNaN(slippagePercent) || slippagePercent <= 0) return null;

    try {
      if (actionType === 'deposit') {
        const expectedShares = isBorrow
          ? await vaultLens.previewDeposit(parsedAmount)
          : await vaultLens.previewDepositCollateral(parsedAmount);
        const minSharesOut = (expectedShares * BigInt(Math.floor((100 - slippagePercent) * 100))) / 10000n;
        return minSharesOut;
      } else if (actionType === 'mint') {
        const expectedAssets = isBorrow
          ? await vaultLens.previewMint(parsedAmount)
          : await vaultLens.previewMintCollateral(parsedAmount);
        const maxAssetsIn = (expectedAssets * BigInt(Math.floor((100 + slippagePercent) * 100))) / 10000n;
        return maxAssetsIn;
      } else if (actionType === 'withdraw') {
        const expectedShares = isBorrow
          ? await vaultLens.previewWithdraw(parsedAmount)
          : await vaultLens.previewWithdrawCollateral(parsedAmount);
        const maxSharesIn = (expectedShares * BigInt(Math.floor((100 + slippagePercent) * 100))) / 10000n;
        return maxSharesIn;
      } else if (actionType === 'redeem') {
        const expectedAssets = isBorrow
          ? await vaultLens.previewRedeem(parsedAmount)
          : await vaultLens.previewRedeemCollateral(parsedAmount);
        const minAssetsOut = (expectedAssets * BigInt(Math.floor((100 - slippagePercent) * 100))) / 10000n;
        return minAssetsOut;
      }
    } catch (err) {
      console.error('Error calculating slippage bound:', err);
      return null;
    }

    return null;
  };

  const executeSafeMethod = async (parsedAmount: bigint, bound: bigint) => {
    if (!address) return;

    if (isBorrow) {
      if (!safeHelperBorrow) {
        console.error('Safe helper for borrow not initialized. Please ensure you are connected to a supported network.');
        return;
      }
      
      let tx;

      if (actionType === 'deposit') {
        tx = await safeHelperBorrow.safeDeposit(vaultAddress, parsedAmount, address, bound);
      } else if (actionType === 'mint') {
        tx = await safeHelperBorrow.safeMint(vaultAddress, parsedAmount, address, bound);
      } else if (actionType === 'withdraw') {
        tx = await safeHelperBorrow.safeWithdraw(vaultAddress, parsedAmount, address, bound);
      } else if (actionType === 'redeem') {
        tx = await safeHelperBorrow.safeRedeem(vaultAddress, parsedAmount, address, bound);
      }

      await tx?.wait();
    } else {
      if (!safeHelperCollateral) {
        console.error('Safe helper for collateral not initialized. Please ensure you are connected to a supported network.');
        return;
      }
      
      let tx;

      if (actionType === 'deposit') {
        tx = await safeHelperCollateral.safeDepositCollateral(vaultAddress, parsedAmount, address, bound);
      } else if (actionType === 'mint') {
        tx = await safeHelperCollateral.safeMintCollateral(vaultAddress, parsedAmount, address, bound);
      } else if (actionType === 'withdraw') {
        tx = await safeHelperCollateral.safeWithdrawCollateral(vaultAddress, parsedAmount, address, bound);
      } else if (actionType === 'redeem') {
        tx = await safeHelperCollateral.safeRedeemCollateral(vaultAddress, parsedAmount, address, bound);
      }

      await tx?.wait();
    }
  };

  const refetchMaxBeforeTx = async (): Promise<bigint | undefined> => {
    if (!vaultLens || !address) return 0n;

    try {
      if (actionType === 'redeem') {
        const userSharesBalance = await vaultLens.balanceOf(address);
        const vaultMaxRedeem = isBorrow
          ? await vaultLens.maxRedeem(address)
          : await vaultLens.maxRedeemCollateral(address);

        return userSharesBalance < vaultMaxRedeem
          ? userSharesBalance
          : vaultMaxRedeem;
      } else if (actionType === 'withdraw') {
        const vaultMaxWithdraw = isBorrow
          ? await vaultLens.maxWithdraw(address)
          : await vaultLens.maxWithdrawCollateral(address);

        return vaultMaxWithdraw;
      }

      console.error('Invalid action type (expected redeem or withdraw):', actionType);
      return;
    } catch (err) {
      console.error('Error refetching max amount before tx:', err);
      return;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError(null);
    setSuccess(null);

    if (!vault || !address) {
      setError('Vault or address not configured.');
      setLoading(false);
      return;
    }

    const helper = isBorrow ? safeHelperBorrow : safeHelperCollateral;
    if (!helper) {
      setError('Safe helper not initialized. Please ensure you are connected to a supported network.');
      setLoading(false);
      return;
    }

    try {
      const parsedAmount = parseUnits(amount, displayDecimals);
      const slippage = parseFloat(slippageTolerance);

      if (isNaN(slippage) || slippage <= 0) {
        setError('Invalid slippage tolerance.');
        setLoading(false);
        return;
      }

      // Calculate slippage bound first (needed for approval amounts)
      const slippageBound = await calculateSlippageBound(parsedAmount);
      if (slippageBound === null) {
        setError('Error calculating slippage bound.');
        setLoading(false);
        return;
      }

      if (config.needsApproval) {
        if (!publicProvider || !vaultLens) return;

        if (actionType === 'withdraw' || actionType === 'redeem') {
          let sharesNeeded: bigint;
          
          if (actionType === 'withdraw') {
            sharesNeeded = slippageBound;
          } else { // redeem
            sharesNeeded = parsedAmount;
          }

          const approved = await handleApproval(sharesNeeded, true);
          if (!approved) {
            setLoading(false);
            return;
          }
        } else {
          if (!tokenLens || !token) return;
          
          let tokensNeeded: bigint;

          if (actionType === 'mint') {
            tokensNeeded = slippageBound;
          } else { // deposit
            tokensNeeded = parsedAmount;
          }

          const balance = await tokenLens.balanceOf(address);

          const hasEnough = await handleWrapIfNeeded(tokensNeeded, balance);
          if (!hasEnough) {
            setLoading(false);
            return;
          }

          const approved = await handleApproval(tokensNeeded, false);
          if (!approved) {
            setLoading(false);
            return;
          }
        }
      }

      let finalAmount = parsedAmount;
      let finalSlippageBound = slippageBound;
      
      if (isMaxSelected && (actionType === 'redeem' || actionType === 'withdraw')) {
        const maxBeforeTx = await refetchMaxBeforeTx();

        if (!maxBeforeTx) {
          setError('Error refetching max amount before tx.');
          console.error('Error refetching max amount before tx.');
          setLoading(false);
          return;
        } else if (maxBeforeTx < parsedAmount) {
          setError('Amount higher than available.');
          console.error('Amount higher than available');
          setLoading(false);
          return;
        }

        finalAmount = maxBeforeTx;
        
        // Recalculate slippage bound for the adjusted amount
        const adjustedSlippageBound = await calculateSlippageBound(finalAmount);
        if (adjustedSlippageBound === null) {
          setError('Error calculating slippage bound.');
          setLoading(false);
          return;
        }
        finalSlippageBound = adjustedSlippageBound;
      }

      await executeSafeMethod(finalAmount, finalSlippageBound);

      await Promise.all([
        refreshBalances(),
        refreshVaultLimits()
      ]);

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
      decimals={Number(displayDecimals)}
      isLoading={loading}
      error={error}
      success={success}
      setAmount={setAmount}
      handleSubmit={handleSubmit}
      setIsMaxSelected={setIsMaxSelected}
      isSafe={true}
      slippageTolerance={slippageTolerance}
      useDefaultSlippage={useDefaultSlippage}
      defaultSlippage={DEFAULT_SLIPPAGE}
      setSlippageTolerance={setSlippageTolerance}
      setUseDefaultSlippage={setUseDefaultSlippage}
      preview={
        amount && previewData ? (
          <PreviewBox
            receive={receive}
            provide={provide}
            isLoading={isLoadingPreview}
            title="Transaction Preview"
          />
        ) : undefined
      }
    />
  );
}

