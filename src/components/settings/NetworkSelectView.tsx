import { SettingsHeader } from './SettingsHeader';
import { SEPOLIA_CHAIN_ID_STRING, MAINNET_CHAIN_ID_STRING } from '@/constants';

interface NetworkSelectViewProps {
  onSelectNetwork: (chainId: string) => void;
  onBack: () => void;
  onClose: () => void;
}

export function NetworkSelectView({ onSelectNetwork, onBack, onClose }: NetworkSelectViewProps) {
  return (
    <div className="space-y-2">
      <SettingsHeader title="Select Network" onClose={onClose} onBack={onBack} />

      <button
        onClick={() => onSelectNetwork(SEPOLIA_CHAIN_ID_STRING)}
        className="w-full text-left px-4 py-3 rounded-lg bg-white hover:bg-gray-50 flex items-center gap-3 transition-colors border border-gray-100"
      >
        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
        <span className="text-gray-700">Sepolia</span>
      </button>
      <button
        onClick={() => onSelectNetwork(MAINNET_CHAIN_ID_STRING)}
        className="w-full text-left px-4 py-3 rounded-lg bg-white hover:bg-gray-50 flex items-center gap-3 transition-colors border border-gray-100"
      >
        <div className="w-2 h-2 rounded-full bg-green-500"></div>
        <span className="text-gray-700">Ethereum</span>
      </button>
    </div>
  );
};
