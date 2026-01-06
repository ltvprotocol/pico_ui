import { Link } from 'react-router-dom';
import { useVaultContext } from '@/contexts';
import { formatTokenSymbol } from '@/utils';
import { Address } from '@/components/ui';

export default function VaultHeader() {
  const { borrowTokenSymbol, collateralTokenSymbol, maxLeverage, lendingName, vaultAddress } = useVaultContext();

  return (
    <div className="w-full flex flex-col justify-between w-full mb-4">
      <Link className="block mb-2 text-gray-700 transition-colors hover:underline hover:text-gray-700 w-fit" to="/">{"< Vaults"}</Link>
      <div className="flex items-center">
        <div className="text-xl font-medium mr-2">{formatTokenSymbol(collateralTokenSymbol)}/{formatTokenSymbol(borrowTokenSymbol)}</div>
        {maxLeverage && <div className="text-xl font-normal mr-2">{`x${maxLeverage}`}</div>}
        <div className="text-xl font-light">{lendingName || "Lending"}</div>
      </div>
      <Address address={vaultAddress} className="text-sm text-gray-500 hover:text-gray-700 max-w-fit" full />
    </div>
  );
}
