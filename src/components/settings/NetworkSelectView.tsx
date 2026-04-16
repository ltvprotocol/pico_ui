import { SettingsHeader } from './SettingsHeader';
import { NETWORKS_LIST } from '@/constants';

interface NetworkSelectViewProps {
  onSelectNetwork: (chainId: string) => void;
  onBack: () => void;
  onClose: () => void;
}

export function NetworkSelectView({ onSelectNetwork, onBack, onClose }: NetworkSelectViewProps) {
  return (
    <div className="space-y-2">
      <SettingsHeader title="Select Network" onClose={onClose} onBack={onBack} />

      {NETWORKS_LIST.map((network) => (
        <button
          key={network.chainIdString}
          onClick={() => onSelectNetwork(network.chainIdString)}
          className="w-full text-left px-4 py-3 rounded-lg bg-white hover:bg-gray-50 flex items-center gap-3 transition-colors border border-gray-100"
        >
          <div className={`w-2 h-2 rounded-full ${network.color}`}></div>
          <span className="text-gray-700">{network.name}</span>
        </button>
      ))}
    </div>
  );
}
