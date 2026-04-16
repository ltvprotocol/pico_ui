type ErrorFlags = {
  isInputMoreThanMax: boolean;
  isAmountLessThanMin: boolean;
  invalidRebalanceMode: boolean;
  hasInsufficientBalance: boolean;
  isErrorLoadingPreview: boolean;
  showWarning?: boolean; // for FlashLoanDepositWithdrawHandler
  flashLoanLoading: boolean;
  isWrapping: boolean;
  inputValue?: string | null;
};

export function isShowWrapPreview(flags: ErrorFlags) {
  const {
    inputValue,
    isInputMoreThanMax,
    isAmountLessThanMin,
    invalidRebalanceMode,
    hasInsufficientBalance,
    isErrorLoadingPreview,
    showWarning = false,
    flashLoanLoading,
    isWrapping,
  } = flags;

  const hasAnyErrorOrWarning =
    isInputMoreThanMax ||
    isAmountLessThanMin ||
    invalidRebalanceMode ||
    hasInsufficientBalance ||
    isErrorLoadingPreview ||
    showWarning;

  const shouldShowWrapPreview =
    isWrapping ||
    (
      !!inputValue &&
      !flashLoanLoading &&
      !hasAnyErrorOrWarning
    );

  return shouldShowWrapPreview;
}
