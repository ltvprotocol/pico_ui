import React from 'react';
import { allowOnlyNumbers, isButtonDisabled, formatForInput } from '@/utils';
import { renderSymbolWithPlaceholder } from '@/helpers/renderSymbolWithPlaceholder';
import { NumberDisplay } from '@/components/ui';

type ActionFormProps = {
  actionName: string;
  amount: string;
  maxAmount: string;
  tokenSymbol: string;
  decimals: number;
  isLoading: boolean;
  error: string | null;
  success: string | null;
  setAmount: React.Dispatch<React.SetStateAction<string>>;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  setIsMaxSelected: React.Dispatch<React.SetStateAction<boolean>>;
  isSafe?: boolean;
  slippageTolerance?: string;
  useDefaultSlippage?: boolean;
  defaultSlippage?: string;
  setSlippageTolerance?: React.Dispatch<React.SetStateAction<string>>;
  setUseDefaultSlippage?: React.Dispatch<React.SetStateAction<boolean>>;
  preview?: React.ReactNode;
}

export const ActionForm: React.FC<ActionFormProps> = ({
  actionName,
  amount,
  maxAmount,
  tokenSymbol,
  decimals,
  isLoading,
  error,
  success,
  setAmount,
  handleSubmit,
  setIsMaxSelected,
  isSafe = false,
  slippageTolerance = '0.5',
  useDefaultSlippage = true,
  defaultSlippage = '0.5',
  setSlippageTolerance,
  setUseDefaultSlippage,
  preview
}) => {
  const setMaxAmount = () => {
    setAmount(formatForInput(maxAmount, decimals));
    setIsMaxSelected(true);
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = allowOnlyNumbers(e.target.value);
    setAmount(value);

    if (value === maxAmount) {
      setIsMaxSelected(true);
    } else {
      setIsMaxSelected(false);
    }
  }

  const handleSlippageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (setSlippageTolerance) {
      setSlippageTolerance(e.target.value);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
          Amount to {actionName}
        </label>
        <div className="relative rounded-md shadow-sm">
          <input
            type="text"
            name="amount"
            id="amount"
            value={amount}
            onChange={handleChange}
            autoComplete="off"
            className="block w-full pr-24 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="0.0"
            step="any"
            required
            disabled={isLoading}
            max={maxAmount}
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <button
              type="button"
              onClick={setMaxAmount}
              className="bg-transparent text-sm text-indigo-600 hover:text-indigo-500 mr-2"
            >
              MAX
            </button>
            <span className="text-gray-500 sm:text-sm">
              {renderSymbolWithPlaceholder({
                symbol: tokenSymbol,
                placeholder: 'Shares',
                elementId: 'action-form-symbol',
                isLoading: !tokenSymbol
              })}
            </span>
          </div>
        </div>
        <div className="flex gap-1 mt-1 text-sm text-gray-500">
          Max Available: {!maxAmount ? 'Loading...' : (
            <>
              <NumberDisplay value={maxAmount} /> {renderSymbolWithPlaceholder({
                symbol: tokenSymbol,
                placeholder: 'Shares',
                elementId: 'action-form-max-available',
                isLoading: !tokenSymbol
              })}
            </>
          )}
        </div>
        {isSafe && (
          <div>
            <div className="flex items-center gap-3 h-[41.6px]">
              <label className="inline-flex items-center text-sm text-gray-700 whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={useDefaultSlippage}
                  className="mr-2 focus:ring-0 focus:outline-none active:ring-0 active:outline-none active:border-0 focus:border-0 focus:outline-none rounded-sm"
                  onChange={(e) => {
                    const checked = e.target.checked;
                    if (setUseDefaultSlippage) {
                      setUseDefaultSlippage(checked);
                    }
                    if (checked && setSlippageTolerance) {
                      setSlippageTolerance(defaultSlippage);
                    }
                  }}
                  disabled={isLoading}
                />
                Use default slippage tolerance ({defaultSlippage}%)
              </label>
              {!useDefaultSlippage && (
                <div className="relative flex-1">
                  <input
                    type="number"
                    name="slippage"
                    id="slippage"
                    value={slippageTolerance}
                    onChange={handleSlippageChange}
                    min={0}
                    max={10}
                    step={0.1}
                    className="block w-full pr-9 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder={defaultSlippage}
                    disabled={isLoading}
                  />
                  <div className="absolute inset-y-0 right-2 flex flex-col justify-center py-0 space-y-0">
                    <button
                      type="button"
                      aria-label="Increase slippage"
                      className="h-3 w-3 p-0 m-0 text-[10px] leading-none text-gray-500 hover:text-gray-700 disabled:opacity-50 bg-transparent border-0 outline-none focus:outline-none focus:ring-0 focus:border-0"
                      disabled={isLoading}
                      onClick={() => {
                        if (!setSlippageTolerance) return;
                        const current = parseFloat(slippageTolerance || '0');
                        if (isNaN(current)) {
                          setSlippageTolerance('0.1');
                          return;
                        }
                        const next = Math.min(10, Math.round((current + 0.1) * 10) / 10);
                        setSlippageTolerance(next.toFixed(1));
                      }}
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      aria-label="Decrease slippage"
                      className="h-3 w-3 p-0 m-0 text-[10px] leading-none text-gray-500 hover:text-gray-700 disabled:opacity-50 bg-transparent border-0 outline-none focus:outline-none focus:ring-0 focus:border-0"
                      disabled={isLoading}
                      onClick={() => {
                        if (!setSlippageTolerance) return;
                        const current = parseFloat(slippageTolerance || '0');
                        if (isNaN(current)) {
                          setSlippageTolerance('0.0');
                          return;
                        }
                        const next = Math.max(0, Math.round((current - 0.1) * 10) / 10);
                        setSlippageTolerance(next.toFixed(1));
                      }}
                    >
                      ▼
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-1 text-xs text-gray-400">
              0% to 10% (0.1% steps)
            </div>
          </div>
        )}
      </div>

      {preview}

      <button
        type="submit"
        disabled={isButtonDisabled(isLoading, amount, maxAmount) || (isSafe && (!slippageTolerance || parseFloat(slippageTolerance) <= 0))}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
      >
        {isLoading ? 'Processing...' : `${actionName}`}
      </button>
      {error && (
        <div className="text-sm text-red-600">
          {error}
        </div>
      )}
      {success && (
        <div className="text-sm text-green-600">
          {success}
        </div>
      )}
    </form>
  )
}
