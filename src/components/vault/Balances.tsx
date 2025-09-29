import { useState } from 'react';
import { useVaultContext } from '@/contexts';
import { renderWithTransition } from '@/helpers/renderWithTransition';

// Custom Tooltip Component
const Tooltip = ({ children, content, isVisible }: { children: React.ReactNode, content: string, isVisible: boolean }) => {
  return (
    <div className="relative inline-block">
      {children}
      {isVisible && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-white text-black text-sm rounded-lg shadow-lg border border-gray-200 whitespace-nowrap z-50">
          {content}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-white"></div>
        </div>
      )}
    </div>
  );
};

export default function Balances() {
  const [hoveredElement, setHoveredElement] = useState<string | null>(null);
  const {
    ethBalance,
    sharesBalance,
    borrowTokenBalance,
    collateralTokenBalance,
    sharesSymbol,
    borrowTokenSymbol,
    collateralTokenSymbol
  } = useVaultContext();

  // Helper function to get display symbol with tooltip
  const getDisplaySymbol = (symbol: string | null, isShares: boolean = false, elementId: string) => {
    if (!symbol) return null;
    
    if (isShares && symbol.length > 6) {
      return (
        <Tooltip content={symbol} isVisible={hoveredElement === elementId}>
          <span 
            className="cursor-pointer" 
            onMouseEnter={() => setHoveredElement(elementId)}
            onMouseLeave={() => setHoveredElement(null)}
          >
            Shares
          </span>
        </Tooltip>
      );
    }
    
    return symbol;
  };

  return (
    <div className="relative rounded-lg bg-gray-50 p-3 mb-4">
      <div className="flex flex-col w-full">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Your Balances</h3>
        <div className="w-full flex justify-between text-sm text-gray-600">
          <div>Ethers:</div>
          <div className="flex min-w-[100px] justify-end">
            <div className="mr-2">
              {renderWithTransition(
                ethBalance,
                !ethBalance || ethBalance === '0'
              )}
            </div>
            <div className="font-medium text-gray-700">ETH</div>
          </div>
        </div>
        <div className="w-full flex justify-between text-sm text-gray-600">
          <div>Shares:</div>
          <div className="flex min-w-[100px] justify-end">
            <div className="mr-2">
              {renderWithTransition(
                sharesBalance,
                !sharesBalance || sharesBalance === '0'
              )}
            </div>
            <div className="font-medium text-gray-700">
              {renderWithTransition(
                getDisplaySymbol(sharesSymbol, true, 'shares-balance'),
                !sharesSymbol
              )}
            </div>
          </div>
        </div>
        <div className="w-full flex justify-between text-sm text-gray-600">
          <div>Borrow Token:</div>
          <div className="flex min-w-[100px] justify-end">
            <div className="mr-2">
              {renderWithTransition(
                borrowTokenBalance,
                !borrowTokenBalance || borrowTokenBalance === '0'
              )}
            </div>
            <div className="font-medium text-gray-700">
              {renderWithTransition(
                borrowTokenSymbol,
                !borrowTokenSymbol
              )}
            </div>
          </div>
        </div>
        <div className="w-full flex justify-between text-sm text-gray-600">
          <div>Collateral Token:</div>
          <div className="flex min-w-[100px] justify-end">
            <div className="mr-2">
              {renderWithTransition(
                collateralTokenBalance,
                !collateralTokenBalance || collateralTokenBalance === '0'
              )}
            </div>
            <div className="font-medium text-gray-700">
              {renderWithTransition(
                collateralTokenSymbol,
                !collateralTokenSymbol
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
