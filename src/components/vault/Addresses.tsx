import { useEffect, useState } from 'react';

import { useAppContext, useVaultContext } from '@/contexts';
import { LendingConnector__factory } from '@/typechain-types';

import { CopyAddress, Loader } from '@/components/ui';

export default function Addresses() {
  const [lendingAddress, setLendingAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const { publicProvider } = useAppContext();
  const { vaultLens, vaultAddress } = useVaultContext();

  useEffect(() => {
    const getLendingAddress = async () => {
      if(!vaultLens) return;

      const lendingConnector = await vaultLens.lendingConnector();
      const lending = LendingConnector__factory.connect(lendingConnector, publicProvider)
      const lendingProtocol = await lending.lendingProtocol();

      setLendingAddress(lendingProtocol);
      setLoading(false);
    }

    getLendingAddress();
  }, [vaultLens, vaultAddress])

  return (
    <div className="relative h-[141px] w-full border border-gray-300 p-3 rounded-lg mb-4">
      {loading ? (
        <Loader />
      ) : (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">Vault:</h3>
          <CopyAddress className="mb-2" address={vaultAddress} />
          <h3 className="text-lg font-medium text-gray-900 mb-1">Lending:</h3>
          <CopyAddress address={lendingAddress ? lendingAddress : ""} />
        </div>
      )}
    </div>
  );
}