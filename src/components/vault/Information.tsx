import { useState } from 'react';
import { formatUnits } from 'ethers';

import { useAppContext, useVaultContext } from '@/contexts';
import { useAdaptiveInterval } from '@/hooks';

import { Loader } from '@/components/ui';

export default function VaultInfo() {
  // const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [maxDeposit, setMaxDeposit] = useState<string>('0');
  const [maxWithdraw, setMaxWithdraw] = useState<string>('0');
  const [maxMint, setMaxMint] = useState<string>('0');
  const [maxRedeem, setMaxRedeem] = useState<string>('0');
  const [totalAssets, setTotalAssets] = useState<string>('0');

  const { address, isConnected } = useAppContext();
  const { vaultLens, sharesSymbol, borrowTokenSymbol } = useVaultContext();

  const getVaultInfo = async () => {
    if (!address || !vaultLens) return;

    // setError(null);

    try {
      const [maxDeposit, maxWithdraw, maxMint, maxRedeem, assets, decimals] = await Promise.all([
        vaultLens.maxDeposit(address),
        vaultLens.maxWithdraw(address),
        vaultLens.maxMint(address),
        vaultLens.maxRedeem(address),
        vaultLens.totalAssets(),
        vaultLens.decimals()
      ]);

      setMaxDeposit(formatUnits(maxDeposit, decimals));
      setMaxWithdraw(formatUnits(maxWithdraw, decimals));
      setMaxMint(formatUnits(maxMint, decimals));
      setMaxRedeem(formatUnits(maxRedeem, decimals));
      setTotalAssets(formatUnits(assets, decimals));

      setLoading(false);
    } catch (err) {
      console.error('Error fetching vault info:', err);
      // setError('An error occurred');
      setLoading(false);
    }
  };

  useAdaptiveInterval(getVaultInfo, {
    enabled: isConnected
  });

  return (
    <div className="relative h-[174px] border border-gray-300 p-3 rounded-lg mb-4 bg-white">
      {loading ? (
        <Loader />
      ) : (
        <div className="space-y-1">
          <h3 className="text-lg font-medium text-gray-900">Vault Information</h3>
          {[
            ["Max Deposit", maxDeposit, borrowTokenSymbol],
            ["Max Withdraw", maxWithdraw, borrowTokenSymbol],
            ["Max Mint", maxMint, sharesSymbol],
            ["Max Redeem", maxRedeem, sharesSymbol],
            ["TVL", totalAssets, borrowTokenSymbol],
          ].map(([label, value, symbol]) => (
            <div key={label as string} className="w-full flex justify-between text-sm text-gray-600">
              <div>{label}:</div>
              <div className="flex">
                <div className="mr-2">{parseFloat(value as string).toFixed(4)}</div>
                <div className="font-medium text-gray-700">{symbol}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}