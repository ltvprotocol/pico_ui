import { useState } from 'react';
import { renderWithTransition } from './renderWithTransition';

// Custom Tooltip Component
const Tooltip = ({ children, content, isVisible }: { children: React.ReactNode, content: string, isVisible: boolean }) => {
  return (
    <div className="relative inline-block">
      {children}
      {isVisible && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-white text-black text-sm rounded-lg shadow-lg border border-gray-200 whitespace-nowrap z-[9999]">
          {content}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-white"></div>
        </div>
      )}
    </div>
  );
};

interface RenderSymbolWithPlaceholderProps {
  symbol: string | null;
  placeholder: string;
  elementId: string;
  isLoading?: boolean;
  threshold?: number;
}

export const renderSymbolWithPlaceholder = ({ 
  symbol, 
  placeholder, 
  elementId, 
  isLoading = false,
  threshold = 6
}: RenderSymbolWithPlaceholderProps) => {
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
          {renderWithTransition(placeholder, isLoading)}
        </span>
      </Tooltip>
    );
  }
  
  return renderWithTransition(symbol, isLoading);
};
