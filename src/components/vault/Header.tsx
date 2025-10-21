import { Link } from 'react-router-dom';

import { useVaultContext } from '@/contexts';

export default function Header() {
  const { borrowTokenSymbol, collateralTokenSymbol, maxLeverage, lendingName } = useVaultContext();

  return (
    <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between w-full mb-4">
      <Link className="mb-2 sm:mb-0 text-gray-700 transition-colors hover:underline hover:text-gray-700" to="/">{"< Vaults"}</Link>
      <div className="flex items-center">
        <div className="text-xl font-medium mr-2">{collateralTokenSymbol}/{borrowTokenSymbol}</div>
        {maxLeverage && <div className="text-xl font-normal mr-2">{`x${maxLeverage}`}</div>}
        <div className="text-xl font-light">{lendingName || "Lending"}</div>
      </div>
    </div>
  );
}
