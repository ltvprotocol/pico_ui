import { useVaultContext } from '@/contexts';
import { CopyAddress } from '@/components/ui';

export default function Addresses() {
  const { vaultAddress, lendingAddress } = useVaultContext();

  return (
    <div className="relative w-full rounded-lg mb-4 bg-gray-50 p-3">
      <h3 className="text-lg font-medium text-gray-900 mb-1">Vault:</h3>
      <CopyAddress className="mb-2" address={vaultAddress ? vaultAddress : ""} />
      <h3 className="text-lg font-medium text-gray-900 mb-1">Lending:</h3>
      <CopyAddress address={lendingAddress ? lendingAddress : ""} />
    </div>
  );
}
