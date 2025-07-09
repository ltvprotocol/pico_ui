import { useState } from 'react';
import { formatUnits } from 'ethers';
import { useAppContext, useVaultContext } from '@/contexts';
import { useAdaptiveInterval } from '@/hooks';

export default function VaultInfo() {
  const [error, setError] = useState<string | null>(null);

  const [maxDeposit, setMaxDeposit] = useState<string>('0');
  const [maxWithdraw, setMaxWithdraw] = useState<string>('0');
  const [maxMint, setMaxMint] = useState<string>('0');
  const [maxRedeem, setMaxRedeem] = useState<string>('0');
  const [totalAssets, setTotalAssets] = useState<string>("0");

  const { address, isConnected } = useAppContext();
  const { vaultLens, sharesSymbol, borrowTokenSymbol } = useVaultContext();

  const getVaultInfo = async () => {
    if (!address || !vaultLens) {
      console.error("Unable to call getVaultInfo");
      return;
    };

    setError(null);

    try {
      const [maxDeposit, maxWithdraw, maxMint, maxRedeem, assets, decimals] = await Promise.all([
        vaultLens.maxDeposit(address),
        vaultLens.maxWithdraw(address),
        vaultLens.maxMint(address),
        vaultLens.maxRedeem(address),
        vaultLens.totalAssets(),
        vaultLens.decimals()
      ]);

      const formattedMaxDeposit = formatUnits(maxDeposit, decimals);
      const formattedMaxWithdraw = formatUnits(maxWithdraw, decimals);
      const formattedMaxMint = formatUnits(maxMint, decimals);
      const formattedMaxRedeem = formatUnits(maxRedeem, decimals);
      const formattedAssets = formatUnits(assets);

      setMaxDeposit(formattedMaxDeposit);
      setMaxWithdraw(formattedMaxWithdraw);
      setMaxMint(formattedMaxMint);
      setMaxRedeem(formattedMaxRedeem);
      setTotalAssets(formattedAssets);
    } catch (err) {
      console.error('Error fetching vault info:', err);
      setError('An error occurred');
      setMaxDeposit('0');
      setMaxRedeem('0');
    }
  };

  useAdaptiveInterval(getVaultInfo, {
    enabled: isConnected
  });

  return (
    <div className="space-y-1 border border-gray-300 p-3 rounded-lg mb-4">
      <h3 className="text-lg font-medium text-gray-900">Vault Information</h3>
      {error ? (
        <div className="text-sm text-red-600">{error}</div>
      ) : (
        <div className="space-y-1">
          <div className="w-full flex justify-between text-sm text-gray-600">
            <div>Max Deposit: </div>
            <div className="flex">
              <div className="mr-2">{parseFloat(maxDeposit).toFixed(4)}</div>
              <div className="font-medium text-gray-700">{borrowTokenSymbol}</div>
            </div>
          </div>
          <div className="w-full flex justify-between text-sm text-gray-600">
            <div>Max Withdraw: </div>
            <div className="flex">
              <div className="mr-2">{parseFloat(maxWithdraw).toFixed(4)}</div>
              <div className="font-medium text-gray-700">{borrowTokenSymbol}</div>
            </div>
          </div>
          <div className="w-full flex justify-between text-sm text-gray-600">
            <div>Max Mint: </div>
            <div className="flex">
              <div className="mr-2">{parseFloat(maxMint).toFixed(4)}</div>
              <div className="font-medium text-gray-700">{sharesSymbol}</div>
            </div>
          </div>
          <div className="w-full flex justify-between text-sm text-gray-600">
            <div>Max Redeem: </div>
            <div className="flex">
              <div className="mr-2">{parseFloat(maxRedeem).toFixed(4)}</div>
              <div className="font-medium text-gray-700">{sharesSymbol}</div>
            </div>
          </div>
          <div className="w-full flex justify-between text-sm text-gray-600">
            <div>TVL: </div>
            <div className="flex">
              <div className="mr-2">{parseFloat(totalAssets).toFixed(4)}</div>
              <div className="font-medium text-gray-700">{borrowTokenSymbol}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}