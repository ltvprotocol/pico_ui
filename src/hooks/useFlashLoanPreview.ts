import { useState, useEffect, useRef } from 'react';
import { FlashLoanMintHelper, FlashLoanRedeemHelper } from '@/typechain-types';
import { TokenType } from '@/types/actions';

type HelperType = 'mint' | 'redeem';

function reduceByPrecisionBuffer(value: bigint): bigint {
  // (10^-6)% = 0.000001% = 10^-8
  const numerator = 99_999_999n;   // 1 - 10^-8
  const denominator = 100_000_000n;

  return (value * numerator) / denominator;
}

interface PreviewData {
  amount: bigint; // mint: collateral required, redeem: borrow tokens to receive
}

interface UseFlashLoanPreviewParams {
  sharesToProcess: bigint | null;
  helperType: HelperType;
  mintHelper: FlashLoanMintHelper | null;
  redeemHelper: FlashLoanRedeemHelper | null;
  sharesBalance: string;
}

interface UseFlashLoanPreviewReturn {
  hasLoadedPreviewOnce: boolean;
  previewData: PreviewData | null;
  receive: Array<{ amount: bigint; tokenType: TokenType }>;
  provide: Array<{ amount: bigint; tokenType: TokenType }>;
  isErrorLoadingPreview: boolean;
  invalidRebalanceMode: boolean;
}

export const useFlashLoanPreview = ({
  sharesToProcess,
  helperType,
  mintHelper,
  redeemHelper,
  sharesBalance,
}: UseFlashLoanPreviewParams): UseFlashLoanPreviewReturn => {
  const [hasLoadedPreviewOnce, setHasLoadedPreviewOnce] = useState(false);
  const [isErrorLoadingPreview, setIsErrorLoadingPreview] = useState(false);
  const [invalidRebalanceMode, setInvalidRebalanceMode] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const isValid =
    sharesToProcess !== null &&
    sharesToProcess > 0n &&
    (
      (helperType === 'mint' && !!mintHelper) ||
      (helperType === 'redeem' && !!redeemHelper)
    );

  const loadPreview = async () => {
    if (!isValid) {
      setPreviewData(null);
      return;
    }

    setIsErrorLoadingPreview(false);
    setInvalidRebalanceMode(false);

    try {
      let amount: bigint;

      if (helperType === 'mint') {
        amount = await mintHelper!.previewMintSharesWithFlashLoanCollateral(
          sharesToProcess!
        );
      } else {
        amount = await redeemHelper!.previewRedeemSharesWithCurveAndFlashLoanBorrow(
          sharesToProcess!
        );
      }

      amount = reduceByPrecisionBuffer(amount);

      setPreviewData({ amount });
      setHasLoadedPreviewOnce(true);

    } catch (err: any) {
      console.error('Error loading preview:', err);
      setIsErrorLoadingPreview(true);

      if (err?.message?.includes('InvalidRebalanceMode')) {
        setInvalidRebalanceMode(true);
      }

      setPreviewData(null);
    }
  };

  // Immediate first load
  // Start auto-refresh every 6s AFTER first load
  useEffect(() => {
    if (!isValid) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    loadPreview();

    // auto refresh
    intervalRef.current = setInterval(() => {
      loadPreview();
    }, 6000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [sharesToProcess, helperType, mintHelper, redeemHelper, sharesBalance]);

  useEffect(() => {
    setHasLoadedPreviewOnce(false);
  }, [sharesToProcess]);

  useEffect(() => {
    setIsErrorLoadingPreview(false);
    setInvalidRebalanceMode(false);
    setPreviewData(null);
  }, [helperType]);

  const receive: Array<{ amount: bigint; tokenType: TokenType }> = [];
  const provide: Array<{ amount: bigint; tokenType: TokenType }> = [];

  if (previewData && sharesToProcess && sharesToProcess > 0n) {
    if (helperType === 'mint') {
      provide.push({ amount: previewData.amount, tokenType: 'collateral' });
      receive.push({ amount: sharesToProcess, tokenType: 'shares' });
    } else {
      provide.push({ amount: sharesToProcess, tokenType: 'shares' });
      receive.push({ amount: previewData.amount, tokenType: 'borrow' });
    }
  }

  return {
    hasLoadedPreviewOnce,
    previewData,
    receive,
    provide,
    isErrorLoadingPreview,
    invalidRebalanceMode
  };
};
