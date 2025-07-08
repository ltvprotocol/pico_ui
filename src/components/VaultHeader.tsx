import { useVaultContext } from '@/contexts';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CopyAddress } from './ui/CopyAddress';

interface VaultHeaderProps {
  vaultAddress: string;
}

export default function VaultHeader({ vaultAddress } : VaultHeaderProps) {
  const [lending, setLending] = useState<string | null>(null);
  const { borrowTokenSymbol, collateralTokenSymbol, vaultLens } = useVaultContext();

  useEffect(() => {
    const getLendingAddress = async () => {
      if(!vaultLens) return;
      const lendingConnector = await vaultLens.lendingConnector();
      setLending(lendingConnector);
    }

    getLendingAddress();
  }, [vaultLens])

  return (
    <div className="w-full">
      <div className="w-full flex items-center justify-between mb-4">
      <Link className="text-gray-700 transition-colors hover:underline hover:text-gray-700" to="/">{"< Vaults"}</Link>
      <div className="flex items-center">
        <div className="text-xl font-medium mr-2">{borrowTokenSymbol}/{collateralTokenSymbol}</div>
        <div className="text-xl">HoldMyBeer</div>
      </div>
      </div>
      <div className="w-full">
        <h3 className="text-lg font-medium text-gray-900 mb-1">Address:</h3>
        <CopyAddress className="mb-4" address={vaultAddress} />
        <h3 className="text-lg font-medium text-gray-900 mb-1">Lending Address:</h3>
        <CopyAddress className="mb-4" address={lending ? lending : ""} />
      </div>
    </div>
  );
}