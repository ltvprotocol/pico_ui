import { useState, useEffect } from 'react';
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
  helper: FlashLoanMintHelper | FlashLoanRedeemHelper | null;
  collateralTokenDecimals: bigint;
  sharesBalance: string;
  sharesDecimals: bigint;
}

interface UseFlashLoanPreviewReturn {
  isLoadingPreview: boolean;
  previewData: PreviewData | null;
  receive: Array<{ amount: bigint; tokenType: TokenType }>;
  provide: Array<{ amount: bigint; tokenType: TokenType }>;
  isErrorLoadingPreview: boolean;
  invalidRebalanceMode: boolean;
}

export const useFlashLoanPreview = ({
  sharesToProcess,
  helperType,
  helper,
  sharesBalance,
}: UseFlashLoanPreviewParams): UseFlashLoanPreviewReturn => {
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isErrorLoadingPreview, setIsErrorLoadingPreview] = useState(false);
  const [invalidRebalanceMode, setInvalidRebalanceMode] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  // const [hasInsufficientBalance, setHasInsufficientBalance] = useState(false);

  const loadPreview = async (shares: bigint | null) => {
    if (!helper || shares === null || shares <= 0n) {
      setPreviewData(null);
      // setHasInsufficientBalance(false);
      return;
    }

    setIsLoadingPreview(true);

    try {
      let amount: bigint;
      if (helperType === 'mint') {
        console.log(shares);
        // returns collateral required
        // @ts-expect-error - helper is FlashLoanMintHelper when helperType is 'mint'
        amount = await helper.previewMintSharesWithFlashLoanCollateral(shares);
      } else {
        // returns borrow tokens to receive
        // @ts-expect-error - helper is FlashLoanRedeemHelper when helperType is 'redeem'
        amount = await helper.previewRedeemSharesWithCurveAndFlashLoanBorrow(shares);
      }
      amount = reduceByPrecisionBuffer(amount);
      setPreviewData({ amount });

    } catch (err: any) {
      setIsErrorLoadingPreview(true);
      console.error('Error loading preview:', err);

      if (err.message.includes('InvalidRebalanceMode')) {
        setInvalidRebalanceMode(true);
      }

      setPreviewData(null);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadPreview(sharesToProcess);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [sharesToProcess, helperType, sharesBalance]);

  // Reset preview data and errors when helper type changes
  useEffect(() => {
    setPreviewData(null);
    setIsErrorLoadingPreview(false);
    setInvalidRebalanceMode(false);
  }, [helperType]);

  const getReceiveAndProvide = () => {
    const receive: Array<{ amount: bigint; tokenType: TokenType }> = [];
    const provide: Array<{ amount: bigint; tokenType: TokenType }> = [];

    if (!sharesToProcess || sharesToProcess <= 0n || !previewData) {
      return { receive, provide };
    }

    if (helperType === 'mint') {
      // For mint: provide collateral, receive shares
      provide.push({ amount: previewData.amount, tokenType: 'collateral' });
      receive.push({ amount: sharesToProcess, tokenType: 'shares' });
    } else {
      // For redeem: provide shares, receive borrow tokens
      provide.push({ amount: sharesToProcess, tokenType: 'shares' });
      receive.push({ amount: previewData.amount, tokenType: 'borrow' });
    }

    return { receive, provide };
  };

  const { receive, provide } = getReceiveAndProvide();

  return {
    isLoadingPreview,
    previewData,
    receive,
    provide,
    isErrorLoadingPreview,
    invalidRebalanceMode
  };
};
