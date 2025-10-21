import { useVaultContext } from '@/contexts';
import { renderWithTransition } from '@/helpers/renderWithTransition';
import { renderSymbolWithPlaceholder } from '@/helpers/renderSymbolWithPlaceholder';
import { NumberDisplay } from '@/components/ui';

export default function Info() {
  const {
    apy,
    apyLoadFailed,
    totalAssets,
    sharesBalance,
    sharesSymbol,
    borrowTokenSymbol,
    description,
  } = useVaultContext();

  const formatApy = (value: number | null) => {
    if (value === null) return null;
    return `${value.toFixed(2)}%`;
  };

  return (
    <div className="relative rounded-lg bg-gray-50 p-3">
      <h3 className="text-lg font-medium text-gray-900 mb-3">Overview</h3>
      <div className="w-full flex justify-between items-center text-sm mb-2">
        <div className="font-medium text-gray-700">APY:</div>
        <div className="min-w-[60px] text-right">
          {renderWithTransition(
            apyLoadFailed ? (
              <span className="text-red-500 italic">Failed to load</span>
            ) : (
              formatApy(apy)
            ),
            !apy && !apyLoadFailed
          )}
        </div>
      </div>
      <div className="w-full flex justify-between items-center text-sm mb-2">
        <div className="font-medium text-gray-700">TVL:</div>
        <div className="min-w-[60px] text-right">
          <div className="flex">
            <div className="mr-2 min-w-[60px] text-right">
              {renderWithTransition(
                <NumberDisplay value={totalAssets} />,
                !totalAssets || totalAssets === '0'
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
      </div>
      <div className="w-full flex justify-between items-center text-sm mb-3">
        <div className="font-medium text-gray-700">Your Position:</div>
        <div className="min-w-[60px] text-right">
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
                  elementId: 'info-shares', 
                  isLoading: !sharesSymbol 
                }),
                !sharesSymbol
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="w-full text-sm mt-6">
        <div className="font-medium text-gray-700 mb-2">Description</div>
        <p className="text-gray-700 max-w-[380px]">
          {description || "No description available for this vault."}
        </p>
      </div>
    </div>
  );
}

