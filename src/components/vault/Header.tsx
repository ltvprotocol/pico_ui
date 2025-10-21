import { Link } from 'react-router-dom';
import { useVaultContext } from '@/contexts';
import { CopyAddress } from '../ui';

interface HeaderProps {
  className?: string;
}

export default function Header({ className }: HeaderProps) {
  const { borrowTokenSymbol, collateralTokenSymbol, maxLeverage, lendingName, vaultAddress } = useVaultContext();

  return (
    <div className={`w-full ${className || ""}`}>
      <Link 
        className="
          block mb-2 text-gray-700 transition-colors
          hover:underline hover:text-gray-700
        " 
        to="/"
      >
        {"< Vaults"}
      </Link>
      <div className="flex items-center mb-1">
        <div className="text-xl font-medium mr-2">{collateralTokenSymbol}/{borrowTokenSymbol}</div>
        {maxLeverage && <div className="text-xl font-normal mr-2">{`x${maxLeverage}`}</div>}
        <div className="text-xl font-light">{lendingName || "Lending"}</div>
      </div>
      <CopyAddress address={vaultAddress} />
    </div>
  );
}
