import { useMemo } from 'react';

interface CompactNumberProps {
  value: number | string | bigint | null | undefined;
  style?: 'currency' | 'decimal';
  currency?: string;
  maximumFractionDigits?: number;
  className?: string;
}

export default function CompactNumber({
  value,
  style = 'decimal',
  currency = 'USD',
  maximumFractionDigits = 2,
  className = ''
}: CompactNumberProps) {
  const formattedValue = useMemo(() => {
    if (value === null || value === undefined) return '-';

    const num = typeof value === 'bigint' ? Number(value) : Number(value);

    if (isNaN(num)) return '-';

    // For very small numbers, just show 0 or <0.01 if needed, but for this usecase (TVL), 
    // we usually deal with large numbers.
    if (num === 0) return '0';

    try {
      const formatter = new Intl.NumberFormat('en-US', {
        notation: 'compact',
        compactDisplay: 'short',
        maximumFractionDigits,
        style: style === 'currency' ? 'currency' : 'decimal',
        currency: style === 'currency' ? currency : undefined,
      });

      return formatter.format(num);
    } catch (e) {
      console.error('Error formatting compact number', e);
      return num.toString();
    }
  }, [value, style, currency, maximumFractionDigits]);

  return <span className={className}>{formattedValue}</span>;
}
