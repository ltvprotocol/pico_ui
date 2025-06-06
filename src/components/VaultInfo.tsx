import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { GME_VAULT_ADDRESS } from '@/constants';
import { useAppContext } from '@/context/AppContext';

interface VaultInfoProps {
  onMaxDeposit: (balance: string) => void;
  onMaxRedeem: (balance: string) => void;
}

export default function VaultInfo({ onMaxDeposit, onMaxRedeem }: VaultInfoProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [maxDeposit, setMaxDeposit] = useState<string>('0');
  const [maxRedeem, setMaxRedeem] = useState<string>('0');

  const { provider, address } = useAppContext();

  const getVaultInfo = async () => {
    if (!address || !provider) return;

    setLoading(true);
    setError(null);

    try {
      const vaultContract = new ethers.Contract(
        GME_VAULT_ADDRESS,
        [
          'function maxDeposit(address) view returns (uint256)',
          'function maxRedeem(address) view returns (uint256)',
          'function decimals() view returns (uint8)',
        ],
        provider
      );

      const [maxDepositAmount, maxRedeemAmount, decimals] = await Promise.all([
        vaultContract.maxDeposit(address),
        vaultContract.maxRedeem(address),
        vaultContract.decimals()
      ]);

      const formattedMaxDeposit = ethers.formatUnits(maxDepositAmount, decimals);
      const formattedMaxRedeem = ethers.formatUnits(maxRedeemAmount, decimals);

      setMaxDeposit(formattedMaxDeposit);
      setMaxRedeem(formattedMaxRedeem);
      onMaxDeposit(maxDepositAmount);
      onMaxRedeem(maxRedeemAmount);
    } catch (err) {
      console.error('Error fetching vault info:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setMaxDeposit('0');
      setMaxRedeem('0');
      onMaxDeposit('0');
      onMaxRedeem('0');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (address && provider) {
      getVaultInfo();
    } else {
      setMaxDeposit('0');
      setMaxRedeem('0');
    }
  }, [address, provider]);

  return (
    <div className="mt-4 p-4 bg-gray-50 rounded-md">
      <h3 className="text-lg font-medium text-gray-900 mb-3">Vault Information</h3>
      {loading ? (
        <div className="text-sm text-gray-600">Loading vault information...</div>
      ) : error ? (
        <div className="text-sm text-red-600">{error}</div>
      ) : (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Max Deposit:</span>
            <span className="text-sm font-medium text-gray-900">
              {parseFloat(maxDeposit).toFixed(4)} WETH
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Max Redeem:</span>
            <span className="text-sm font-medium text-gray-900">
              {parseFloat(maxRedeem).toFixed(4)} GME
            </span>
          </div>
        </div>
      )}
    </div>
  );
} 