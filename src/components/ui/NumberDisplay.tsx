import { truncate } from '@/utils';
import React from 'react';

interface NumberDisplayProps {
  value: string | number;
  maxDecimals?: number;
  className?: string;
}

export const NumberDisplay: React.FC<NumberDisplayProps> = ({
  value,
  maxDecimals = 4,
  className = ''
}) => {
  const formatNumber = (val: string | number): React.ReactNode => {
    const numValue = typeof val === 'string' ? parseFloat(val) : val;

    if (isNaN(numValue)) {
      return '0';
    }

    if (numValue === 0) {
      return '0';
    }

    if (Math.abs(numValue) < 0.0001 && Math.abs(numValue) > 0) {
      const str = numValue.toFixed(20);
      const match = str.match(/^-?0\.0*[1-9]/);

      if (match) {
        const afterDecimal = str.split('.')[1];
        const leadingZeros = afterDecimal.match(/^0*/)?.[0].length || 0;

        if (leadingZeros > 3) {
          const firstNonZeroIndex = afterDecimal.search(/[1-9]/);
          const significantPart = afterDecimal.substring(firstNonZeroIndex, firstNonZeroIndex + 3);

          const trimmed = significantPart.replace(/0+$/, '');

          const subscriptDigits = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];
          const subscript = leadingZeros.toString().split('').map(d => subscriptDigits[parseInt(d)]).join('');

          return (
            <span>
              {numValue < 0 ? '-' : ''}0.0{subscript}{trimmed}
            </span>
          );
        }
      }
    }

    const formatted = truncate(numValue, maxDecimals);
    const trimmed = formatted.replace(/\.?0+$/, '');

    return trimmed;
  };

  return <span className={className}>{formatNumber(value)}</span>;
};

