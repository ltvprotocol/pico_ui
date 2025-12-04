import { Link } from 'react-router-dom';
import { useVaultContext } from '@/contexts';
import { shortAddress, formatTokenSymbol } from '@/utils';

export default function VaultHeader() {
  const { borrowTokenSymbol, collateralTokenSymbol, maxLeverage, lendingName, vaultAddress } = useVaultContext();
  const shortVaultAddress = vaultAddress ? shortAddress(vaultAddress) : '';

  return (
    <div className="w-full flex flex-col justify-between w-full mb-4">
      <Link className="block mb-2 text-gray-700 transition-colors hover:underline hover:text-gray-700" to="/">{"< Vaults"}</Link>
      <div className="flex items-center">
        <div className="text-xl font-medium mr-2">{formatTokenSymbol(collateralTokenSymbol)}/{formatTokenSymbol(borrowTokenSymbol)}</div>
        {maxLeverage && <div className="text-xl font-normal mr-2">{`x${maxLeverage}`}</div>}
        <div className="text-xl font-light">{lendingName || "Lending"}</div>
      </div>
      <div className="text-sm text-gray-500 [@media(max-width:450px)]:hidden">{vaultAddress}</div>
      <div className="hidden text-sm text-gray-500 [@media(max-width:450px)]:block">{shortVaultAddress}</div>
    </div>
  );
}
