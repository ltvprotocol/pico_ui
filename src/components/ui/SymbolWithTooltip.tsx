import { useState } from 'react';
import { TransitionLoader, Tooltip } from '@/components/ui';

interface SymbolWithTooltipProps {
  symbol: string | null;
  placeholder: string;
  elementId: string;
  isLoading?: boolean;
  threshold?: number;
}

export function SymbolWithTooltip({
  symbol,
  placeholder,
  elementId,
  isLoading = false,
  threshold = 22
}: SymbolWithTooltipProps) {
  const [hoveredElement, setHoveredElement] = useState<string | null>(null);

  if (!symbol) return null;

  if (symbol.length > threshold) {
    return (
      <Tooltip content={symbol} isVisible={hoveredElement === elementId}>
        <span
          className="cursor-pointer"
          onMouseEnter={() => setHoveredElement(elementId)}
          onMouseLeave={() => setHoveredElement(null)}
        >
          <TransitionLoader isLoading={isLoading}>
            {placeholder}
          </TransitionLoader>
        </span>
      </Tooltip>
    );
  }

  return (
    <TransitionLoader isLoading={isLoading}>
      {symbol}
    </TransitionLoader>
  );
};
