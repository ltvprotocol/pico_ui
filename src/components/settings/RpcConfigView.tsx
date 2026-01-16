import { useState, useEffect } from 'react';
import { SettingsHeader } from './SettingsHeader';
import { NETWORK_CONFIGS, SEPOLIA_CHAIN_ID_STRING, MAINNET_CHAIN_ID_STRING } from '@/constants';
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
  const [defaultRpcDisplay, setDefaultRpcDisplay] = useState<string>('');
  const [isCustomRpcSet, setIsCustomRpcSet] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    // Load current RPC
    const custom = localStorage.getItem(`custom_rpc_${selectedNetwork}`);
    const config = (NETWORK_CONFIGS as any)[selectedNetwork];
    const defaultUrl = config ? config.rpcUrls[0] : '';

    // If custom is set, show it in input. If not, input is empty.
    setRpcUrl(custom || '');
    // Active is custom if exists, else it's default
    setActiveRpcDisplay(custom || defaultUrl);
    setDefaultRpcDisplay(defaultUrl);

    setIsCustomRpcSet(!!custom);
    setError(null);
    setSuccess(null);
  }, [selectedNetwork]);

  const validateAndSave = async () => {
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      const config = (NETWORK_CONFIGS as any)[selectedNetwork];
      const defaultUrl = config ? config.rpcUrls[0] : '';

      if (defaultUrl && rpcUrl.trim() === defaultUrl) {
        localStorage.removeItem(`custom_rpc_${selectedNetwork}`);
        await refreshPublicProvider();
        setIsCustomRpcSet(false);
        setSuccess('This is the default RPC URL.');
        setIsLoading(false);
        setActiveRpcDisplay(defaultUrl);
        setRpcUrl('');
        setTimeout(() => {
          window.location.reload();
        }, 1000);
        return;
      }

      if (!rpcUrl.startsWith('http://') && !rpcUrl.startsWith('https://')) {
        throw new Error('URL must start with http:// or https://');
      }

      const tempProvider = new JsonRpcProvider(rpcUrl);
      const network = await tempProvider.getNetwork();

      const returnedChainId = network.chainId.toString();

      let expectedChainIdBigInt;
      if (selectedNetwork === SEPOLIA_CHAIN_ID_STRING) {
        expectedChainIdBigInt = 11155111n;
      } else if (selectedNetwork === MAINNET_CHAIN_ID_STRING) {
        expectedChainIdBigInt = 1n;
      }

      if (expectedChainIdBigInt && network.chainId !== expectedChainIdBigInt) {
        throw new Error(`Chain ID mismatch. Expected ${expectedChainIdBigInt}, got ${returnedChainId}`);
      }

      localStorage.setItem(`custom_rpc_${selectedNetwork}`, rpcUrl);
      await refreshPublicProvider();
      setIsCustomRpcSet(true);
      setActiveRpcDisplay(rpcUrl);
      setSuccess('RPC updated successfully! Reloading...');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
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
      const config = (NETWORK_CONFIGS as any)[selectedNetwork];
      if (!config) throw new Error("Unknown network config");

      const defaultUrl = config.rpcUrls[0];
      setRpcUrl('');
      setActiveRpcDisplay(defaultUrl);

      localStorage.removeItem(`custom_rpc_${selectedNetwork}`);
      await refreshPublicProvider();
      setIsCustomRpcSet(false);
      setSuccess('Reset to default successfully. Reloading...');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      setError('Failed to reset RPC');
    } finally {
      setIsLoading(false);
    }
  };

  // Determine if save should be disabled
  const isInputEmpty = !rpcUrl || rpcUrl.trim() === '';
  const isInputDefault = rpcUrl.trim() === defaultRpcDisplay;
  const isSaveDisabled = isLoading || isInputEmpty || isInputDefault;

  return (
    <div className="space-y-4">
      <SettingsHeader title="Configure RPC" onClose={onClose} onBack={onBack} />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Active RPC URL for {selectedNetwork === SEPOLIA_CHAIN_ID_STRING ? 'Sepolia' : 'Ethereum'}
        </label>
        <div className="mb-2 p-2 bg-gray-50 rounded border border-gray-200 text-xs text-gray-600 font-mono max-w-[286.4px] overflow-x-auto whitespace-nowrap select-text cursor-text">
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
