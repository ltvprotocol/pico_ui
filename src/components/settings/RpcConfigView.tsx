import { useState, useEffect } from 'react';
import { SettingsHeader } from './SettingsHeader';
import { NETWORK_CONFIGS } from '@/constants';
import { useAppContext } from '@/contexts';
import { JsonRpcProvider } from 'ethers';
import { WarningMessage, SuccessMessage } from '@/components/ui';

interface RpcConfigViewProps {
  selectedNetwork: string;
  onBack: () => void;
  onClose: () => void;
}

export function RpcConfigView({ selectedNetwork, onBack, onClose }: RpcConfigViewProps) {
  const { refreshPublicProvider } = useAppContext();

  const [rpcUrl, setRpcUrl] = useState<string>('');
  const [activeRpcDisplay, setActiveRpcDisplay] = useState<string>('');

  const [isCustomRpcSet, setIsCustomRpcSet] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const getDefaultUrl = () => {
    return NETWORK_CONFIGS[selectedNetwork]?.rpcUrls[0] ?? '';
  };

  useEffect(() => {
    // Load current RPC
    const custom = localStorage.getItem(`custom_rpc_${selectedNetwork}`);
    const defaultUrl = getDefaultUrl();

    // If custom is set, show it in input. If not, input is empty.
    setRpcUrl(custom || '');
    // Active is custom if exists, else it's default
    setActiveRpcDisplay(custom || defaultUrl);


    setIsCustomRpcSet(!!custom);
    setError(null);
    setSuccess(null);
  }, [selectedNetwork]);

  const validateAndSave = async () => {
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      if (!rpcUrl.startsWith('http://') && !rpcUrl.startsWith('https://')) {
        throw new Error('URL must start with http:// or https://');
      }

      const tempProvider = new JsonRpcProvider(rpcUrl);
      const network = await tempProvider.getNetwork();

      const returnedChainId = network.chainId.toString();

      const networkConfig = NETWORK_CONFIGS[selectedNetwork];
      const expectedChainIdBigInt = networkConfig?.chainIdBigInt;

      if (expectedChainIdBigInt && network.chainId !== expectedChainIdBigInt) {
        throw new Error(`Chain ID mismatch. Expected ${expectedChainIdBigInt}, got ${returnedChainId}`);
      }

      const currentStored = localStorage.getItem(`custom_rpc_${selectedNetwork}`);
      if (currentStored !== rpcUrl) {
        localStorage.setItem(`custom_rpc_${selectedNetwork}`, rpcUrl);
        await refreshPublicProvider();
      }

      setIsCustomRpcSet(true);
      setActiveRpcDisplay(rpcUrl);
      setSuccess('RPC updated successfully!');
    } catch (err: any) {
      console.error("RPC Validation failed:", err);
      const msg = err.message || '';

      if (
        msg.includes('NetworkError') ||
        msg.includes('Failed to fetch') ||
        msg.includes('connection refused') ||
        err.code === "NETWORK_ERROR"
      ) {
        setError('This RPC URL is not responding.');
      } else {
        setError('Failed to connect to RPC');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const defaultUrl = getDefaultUrl();
      setRpcUrl('');
      setActiveRpcDisplay(defaultUrl);

      localStorage.removeItem(`custom_rpc_${selectedNetwork}`);
      await refreshPublicProvider();
      setIsCustomRpcSet(false);
      setSuccess('Reset to default successfully.');
    } catch (err: any) {
      setError('Failed to reset RPC');
    } finally {
      setIsLoading(false);
    }
  };

  // Determine if save should be disabled
  const isInputEmpty = !rpcUrl || rpcUrl.trim() === '';
  const isSaveDisabled = isLoading || isInputEmpty;

  return (
    <div className="space-y-4">
      <SettingsHeader title="Configure RPC" onClose={onClose} onBack={onBack} />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Active RPC URL for {NETWORK_CONFIGS[selectedNetwork]?.name ?? 'Network'}
        </label>
        <div
          className="mb-2 p-2 bg-gray-50 rounded border border-gray-200 text-xs text-gray-600 font-mono max-w-[286.4px] overflow-x-auto whitespace-nowrap select-text cursor-text"
          style={{ colorScheme: 'light' }}
        >
          {activeRpcDisplay}
        </div>

        <label className="block text-sm font-medium text-gray-700 mb-1 mt-3">
          New Custom RPC URL
        </label>
        <input
          type="text"
          value={rpcUrl}
          onChange={(e) => setRpcUrl(e.target.value)}
          disabled={isLoading}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          placeholder="https://..."
        />
      </div>

      {error && <WarningMessage text={error} className="max-w-[286.4px]" />}
      {success && <SuccessMessage text={success} className="max-w-[286.4px]" />}

      <div className="flex flex-col gap-2">
        <button
          onClick={validateAndSave}
          disabled={isSaveDisabled}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {isLoading ? 'Saving...' : 'Save'}
        </button>
        {isCustomRpcSet && (
          <button
            onClick={handleReset}
            disabled={isLoading}
            className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            Reset to Default
          </button>
        )}
      </div>
    </div>
  );
};
