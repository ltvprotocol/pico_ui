import { useVaultContext } from '@/contexts';
import { renderWithTransition } from '@/helpers/renderWithTransition';
import { renderSymbolWithPlaceholder } from '@/helpers/renderSymbolWithPlaceholder';
import { NumberDisplay } from '@/components/ui';

interface InfoProps {
  className?: string;
}

export default function Info({ className }: InfoProps) {
  const {
    apy,
    apyLoadFailed,
    totalAssets,
    sharesBalance,
    sharesSymbol,
    borrowTokenSymbol
  } = useVaultContext();

  return (
    <div className={`relative rounded-lg bg-white p-4 ${className ?? ''}`}>      
      <div className="w-full flex justify-between items-center text-sm mb-2">
        <div className="text-gray-600">APY:</div>
        <div className="min-w-[60px] text-right font-medium text-gray-900">
          {renderWithTransition(
            apy ? `${apy.toFixed(2)}%` : 
            apyLoadFailed ? <span className="text-red-500 italic text-xs">Failed to load</span> : null,
            !apy && !apyLoadFailed
          )}
        </div>
      </div>
      <div className="w-full flex justify-between items-center text-sm mb-2">
        <div className="text-gray-600">TVL:</div>
        <div className="flex">
          <div className="mr-2 min-w-[60px] text-right">
            {renderWithTransition(
              <NumberDisplay value={totalAssets} />,
              !totalAssets || totalAssets === '0'
            )}
          </div>
          <div className="font-medium text-gray-700">
            {renderWithTransition(
              renderSymbolWithPlaceholder({ 
                symbol: borrowTokenSymbol, 
                placeholder: 'Tokens', 
                elementId: 'tvl-symbol', 
                isLoading: !borrowTokenSymbol 
              }),
              !borrowTokenSymbol
            )}
          </div>
        </div>
      </div>

      <div className="w-full flex justify-between items-center text-sm mb-3">
        <div className="text-gray-600">Your Position:</div>
        <div className="flex">
          <div className="mr-2 min-w-[60px] text-right">
            {renderWithTransition(
              <NumberDisplay value={sharesBalance} />,
              !sharesBalance || sharesBalance === '0'
            )}
          </div>
          <div className="font-medium text-gray-700">
            {renderWithTransition(
              renderSymbolWithPlaceholder({ 
                symbol: sharesSymbol, 
                placeholder: 'Shares', 
                elementId: 'position-symbol', 
                isLoading: !sharesSymbol 
              }),
              !sharesSymbol
            )}
          </div>
        </div>
      </div>
      <div className="w-full text-sm">
        <div className="text-gray-900 mb-1">Description</div>
        <p className="text-gray-600 text-xs leading-relaxed">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.
        </p>
      </div>
    </div>
  );
}
