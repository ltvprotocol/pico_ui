import { useState, useEffect } from 'react';
import { MainView } from './settings/MainView';
import { NetworkSelectView } from './settings/NetworkSelectView';
import { RpcConfigView } from './settings/RpcConfigView';

interface SettingsPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

type View = 'main' | 'network-select' | 'rpc-config';

export default function SettingsPopup({ isOpen, onClose }: SettingsPopupProps) {
  const [currentView, setCurrentView] = useState<View>('main');
  const [selectedNetwork, setSelectedNetwork] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      // Reset navigation state when closed
      setCurrentView('main');
      setSelectedNetwork(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleNetworkSelect = (chainId: string) => {
    setSelectedNetwork(chainId);
    setCurrentView('rpc-config');
  };

  return (
    <div className="
      absolute top-[65px] right-0 bg-white rounded-lg
      min-w-[320px] z-50 overflow-hidden shadow-lg border border-gray-100
    ">
      <div className="p-4">
        {currentView === 'main' && (
          <MainView
            onNavigateToNetworkSelect={() => setCurrentView('network-select')}
            onClose={onClose}
          />
        )}

        {currentView === 'network-select' && (
          <NetworkSelectView
            onSelectNetwork={handleNetworkSelect}
            onBack={() => setCurrentView('main')}
            onClose={onClose}
          />
        )}

        {currentView === 'rpc-config' && selectedNetwork && (
          <RpcConfigView
            selectedNetwork={selectedNetwork}
            onBack={() => setCurrentView('network-select')}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
}
