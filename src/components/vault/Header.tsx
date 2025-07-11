import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatUnits } from 'ethers';

import { useVaultContext } from '@/contexts';
import { ltvToLeverage } from '@/utils';

export default function Header() {
  const [maxLeverage, setMaxLeverage] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const { borrowTokenSymbol, collateralTokenSymbol, vaultLens } = useVaultContext();

  useEffect(() => {
    const getLeverage = async () => {
      if(!vaultLens) return;

      const rawLtv = await vaultLens.targetLTV();
      const ltv = parseFloat(formatUnits(rawLtv, 18)).toFixed(4);
      const leverage = ltvToLeverage(parseFloat(ltv));

      setMaxLeverage(leverage);
      setLoading(false);
    };

    getLeverage();
  }, [vaultLens]);

  return (
      <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between w-full mb-4">
        <Link className="mb-2 sm:mb-0 text-gray-700 transition-colors hover:underline hover:text-gray-700" to="/">{"< Vaults"}</Link>
        {loading ? (
          <div className="flex items-center">
            Loading...
          </div>
        ) : (
          <div className="flex items-center">
            <div className="text-xl font-medium mr-2">{borrowTokenSymbol}/{collateralTokenSymbol}</div>
            <div className="text-xl font-normal mr-2">{`x${maxLeverage}`}</div>
            <div className="text-xl font-light">HodlMyBeer</div>
          </div>
        )}
      </div>
  );
}