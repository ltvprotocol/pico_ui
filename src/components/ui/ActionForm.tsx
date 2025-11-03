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
              className="text-sm text-indigo-600 hover:text-indigo-500 mr-2"
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
      </div>
      
      {preview}
      
      <button
        type="submit"
        disabled={isButtonDisabled(isLoading, amount, maxAmount)}
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