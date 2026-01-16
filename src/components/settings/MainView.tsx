import { SettingsHeader } from './SettingsHeader';

interface MainViewProps {
  onNavigateToNetworkSelect: () => void;
  onClose: () => void;
}

export function MainView({ onNavigateToNetworkSelect, onClose }: MainViewProps) {
  return (
    <div className="space-y-2">
      <SettingsHeader title="Settings" onClose={onClose} />
      <button
        onClick={onNavigateToNetworkSelect}
        className="w-full text-left px-4 py-3 rounded-lg bg-white hover:bg-gray-50 flex justify-between items-center transition-colors border border-gray-100"
      >
        <span className="font-medium text-gray-700">Set Custom RPC</span>
        <svg className="w-5 h-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  );
};
