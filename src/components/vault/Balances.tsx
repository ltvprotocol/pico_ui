import { useVaultContext } from '@/contexts';
import { renderWithTransition } from '@/helpers/renderWithTransition';

export default function Balances() {
  const {
    ethBalance,
    sharesBalance,
    borrowTokenBalance,
    collateralTokenBalance,
    sharesSymbol,
    borrowTokenSymbol,
    collateralTokenSymbol
  } = useVaultContext();

  return (
    <div className="relative rounded-lg bg-gray-50 p-3 mb-4">
      <div className="flex flex-col w-full space-y-1">
        <h3 className="text-lg font-medium text-gray-900">Your Balances</h3>
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
                sharesSymbol,
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
