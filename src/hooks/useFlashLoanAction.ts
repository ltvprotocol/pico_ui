import { useEffect, useState } from 'react';
import { isUserRejected } from '@/utils';
import { useVaultContext } from '@/contexts';
import { applyGasSlippage } from '@/utils';
import { refreshTokenHolders } from '@/utils';

type FlashLoanMode = 'mint' | 'redeem' | 'deposit' | 'withdraw';

// fixed slippage for redeem, 0.1%
const REDEEM_SLIPPAGE_DIVIDEND = 999n;
const REDEEM_SLIPPAGE_DIVIDER = 1000n;

const applyRedeemSlippage = (amount: bigint) => {
  return amount * REDEEM_SLIPPAGE_DIVIDEND / REDEEM_SLIPPAGE_DIVIDER;
}

interface UseFlashLoanActionParams {
  mode: FlashLoanMode;
  currentNetwork: string;

  userAddress?: string;
  helperAddress?: string;
  previewAmount?: bigint; // mint: collateral to provide | redeem: borrow to receive 
  sharesAmount?: bigint;  // shares to mint or redeem

  refreshMins: () => Promise<void>;
}

export function useFlashLoanAction({
  mode,
  currentNetwork,
  userAddress,
  helperAddress,
  previewAmount,
  sharesAmount,
  refreshMins
}: UseFlashLoanActionParams) {
  const [loading, setLoading] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [error, setError] = useState<string>('');
  const [approvalError, setApprovalError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const { vault, vaultLens, flashLoanMintHelper, flashLoanRedeemHelper, collateralToken, collateralTokenLens, refreshBalances, refreshVaultLimits } = useVaultContext();

  useEffect(() => {
    if (!success || loading) return;

    const timer = setTimeout(() => {
      setSuccess('');
    }, 5000);

    return () => clearTimeout(timer);
  }, [success]);

  const checkAndApprove = async () => {
    if (!previewAmount || !userAddress || !helperAddress || !sharesAmount) {
      return;
    }

    setIsApproving(true);
    setApprovalError('');

    try {
      if (mode === 'mint' || mode === 'deposit') {
        if (!collateralToken || !collateralTokenLens) return;

        const allowance = await collateralTokenLens.allowance(userAddress, helperAddress);

        if (allowance < previewAmount) {
          const tx = await collateralToken.approve(helperAddress, previewAmount);
          await tx.wait();
          setSuccess(`Successfully approved.`);
        } else {
          setSuccess('Already approved token.');
        }
      } else { // redeem || withdraw
        if (!vault || !vaultLens) return;

        const allowance = await vaultLens.allowance(userAddress, helperAddress);
        if (allowance < sharesAmount) {
          const tx = await vault.approve(helperAddress, sharesAmount);
          await tx.wait();
          setSuccess('Successfully approved levereged token.');
        } else {
          setSuccess('Already approved levereged token.');
        }
      }
    } catch (err) {
      if (isUserRejected(err)) {
        setApprovalError('Approval canceled by user.');
      } else {
        setApprovalError('Failed to approve.');
        console.error('Failed to approve.', err);
      }
      throw err; // If approve failed need to throw error to exit from executing
    } finally {
      setIsApproving(false);
    }
  };

  const execute = async (): Promise<boolean> => {
    if (!userAddress || !sharesAmount || sharesAmount <= 0n) return false;

    setLoading(true);
    setError('');
    setSuccess('');
    setApprovalError('');

    try {
      await checkAndApprove();

      let tx;

      if (mode === 'mint') {
        if (!flashLoanMintHelper) return false;

        const estimatedGas = await flashLoanMintHelper.mintSharesWithFlashLoanCollateral.estimateGas(sharesAmount);
        tx = await flashLoanMintHelper.mintSharesWithFlashLoanCollateral(sharesAmount, {
          gasLimit: applyGasSlippage(estimatedGas)
        });
      } else { // redeem
        if (!flashLoanRedeemHelper || !previewAmount) return false;

        const minOut = applyRedeemSlippage(previewAmount);

        const estimatedGas = await flashLoanRedeemHelper.redeemSharesWithCurveAndFlashLoanBorrow.estimateGas(sharesAmount, minOut);
        tx = await flashLoanRedeemHelper.redeemSharesWithCurveAndFlashLoanBorrow(sharesAmount, minOut, {
          gasLimit: applyGasSlippage(estimatedGas)
        });
      }

      await tx.wait();

      await Promise.all([
        refreshBalances(),
        refreshVaultLimits(),
        refreshTokenHolders(currentNetwork)
      ]);

      await refreshMins();

      setSuccess(`Successfully ${mode === 'mint' ? 'minted' : 'redeemed'} with flash loan!`);
      return true;
    } catch (err) {
      if (isUserRejected(err)) {
        setError('Transaction canceled by user.');
      } else {
        setError(`Failed to ${mode} with flash loan`);
        console.error(`Failed to ${mode} with flash loan:`, err);
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setError('');
    setApprovalError('');
    setSuccess('');
  };

  return {
    execute,
    reset,
    loading,
    isApproving,
    error,
    approvalError,
    success
  };
}
