import { useState, useEffect } from 'react';
import { parseUnits } from 'ethers';
import { ActionType, TokenType } from '@/types/actions';
import { Vault } from '@/typechain-types';

interface PreviewData {
  assets?: bigint;
  shares?: bigint;
}

interface UseActionPreviewParams {
  amount: string;
  actionType: ActionType;
  tokenType: TokenType;
  vaultLens: Vault | null;
  displayDecimals: bigint;
  isBorrow: boolean;
}

interface UseActionPreviewReturn {
  isLoadingPreview: boolean;
  previewData: PreviewData | null;
  receive: Array<{ amount: bigint; tokenType: TokenType }>;
  provide: Array<{ amount: bigint; tokenType: TokenType }>;
}

export const useActionPreview = ({
  amount,
  actionType,
  tokenType,
  vaultLens,
  displayDecimals,
  isBorrow,
}: UseActionPreviewParams): UseActionPreviewReturn => {
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);

  const loadPreview = async (previewAmount: string) => {
    if (!vaultLens || !previewAmount || previewAmount === '' || previewAmount === '.') {
      setPreviewData(null);
      return;
    }

    setIsLoadingPreview(true);

    try {
      const parsed = parseUnits(previewAmount, displayDecimals);

      if (actionType === 'deposit') {
        const shares = isBorrow
          ? await vaultLens.previewDeposit(parsed)
          : await vaultLens.previewDepositCollateral(parsed);
        setPreviewData({ shares });
      } else if (actionType === 'mint') {
        const assets = isBorrow
          ? await vaultLens.previewMint(parsed)
          : await vaultLens.previewMintCollateral(parsed);
        setPreviewData({ assets });
      } else if (actionType === 'withdraw') {
        const shares = isBorrow
          ? await vaultLens.previewWithdraw(parsed)
          : await vaultLens.previewWithdrawCollateral(parsed);
        setPreviewData({ shares });
      } else if (actionType === 'redeem') {
        const assets = isBorrow
          ? await vaultLens.previewRedeem(parsed)
          : await vaultLens.previewRedeemCollateral(parsed);
        setPreviewData({ assets });
      }
    } catch (err) {
      console.error('Error loading preview:', err);
      setPreviewData(null);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadPreview(amount);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [amount, actionType, tokenType]);

  // Reset preview data when action/token changes
  useEffect(() => {
    setPreviewData(null);
  }, [actionType, tokenType]);

  const getReceiveAndProvide = () => {
    const receive: Array<{ amount: bigint; tokenType: TokenType }> = [];
    const provide: Array<{ amount: bigint; tokenType: TokenType }> = [];

    if (!amount || !previewData) {
      return { receive, provide };
    }

    try {
      const parsedAmount = parseUnits(amount, displayDecimals);

      if (actionType === 'deposit') {
        provide.push({ amount: parsedAmount, tokenType });
        if (previewData.shares) {
          receive.push({ amount: previewData.shares, tokenType: 'shares' });
        }
      } else if (actionType === 'mint') {
        if (previewData.assets) {
          provide.push({ amount: previewData.assets, tokenType });
        }
        receive.push({ amount: parsedAmount, tokenType: 'shares' });
      } else if (actionType === 'withdraw') {
        if (previewData.shares) {
          provide.push({ amount: previewData.shares, tokenType: 'shares' });
        }
        receive.push({ amount: parsedAmount, tokenType });
      } else if (actionType === 'redeem') {
        provide.push({ amount: parsedAmount, tokenType: 'shares' });
        if (previewData.assets) {
          receive.push({ amount: previewData.assets, tokenType });
        }
      }
    } catch (err) {
      console.error('Error parsing amount for preview:', err);
    }

    return { receive, provide };
  };

  const { receive, provide } = getReceiveAndProvide();

  return {
    isLoadingPreview,
    previewData,
    receive,
    provide,
  };
};

