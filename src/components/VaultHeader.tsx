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
      <div className="flex items-center justify-between w-full mb-4">
        <Link className="text-gray-700 transition-colors hover:underline hover:text-gray-700" to="/">{"< Vaults"}</Link>
        <div className="flex items-center">
          <div className="text-xl font-medium mr-2">{borrowTokenSymbol}/{collateralTokenSymbol}</div>
          <div className="text-xl font-light">HodlMyBeer</div>
        </div>
      </div>
      <div className="w-full border border-gray-300 p-3 rounded-lg mb-4">
        <h3 className="text-lg font-medium text-gray-900 mb-1">Vault:</h3>
        <CopyAddress className="mb-2" address={vaultAddress} />
        <h3 className="text-lg font-medium text-gray-900 mb-1">Lending:</h3>
        <CopyAddress address={lending ? lending : ""} />
      </div>
    </div>
  );
}