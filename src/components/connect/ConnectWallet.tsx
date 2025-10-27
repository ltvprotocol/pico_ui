import { useAppContext } from '@/contexts';
import { useState, useRef, useEffect } from 'react';
import { shortAddress } from '@/utils';
import { URL_PARAM_TO_CHAIN_ID } from '@/constants';
import WalletsPopup from './WalletsPopup';
import NetworkSwitchPopup from './NetworkSwitchPopup';
import NetworkSelect from './NetworkSelect';

export default function ConnectWallet() {
  const {
    isConnected, isAutoConnecting, isSepolia, isMainnet, currentNetwork,
    address, wallets, connectingWalletId, disconnectWallet
  } = useAppContext();

  const [showWalletsPopup, setShowWalletsPopup] = useState<boolean>(false);
  const [showNetworkPopup, setShowNetworkPopup] = useState<boolean>(false);
  const popupRef = useRef<HTMLDivElement>(null);

  const getUrlNetworkMismatch = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const networkParam = urlParams.get('network');
    if (!networkParam) return null;
    
    const recognizedNetwork = URL_PARAM_TO_CHAIN_ID[networkParam as keyof typeof URL_PARAM_TO_CHAIN_ID];
    
    if (!recognizedNetwork) {
      return null;
    }
    
    const expectedChainId = recognizedNetwork;
    const currentChainId = currentNetwork;
    
    return currentChainId !== expectedChainId ? networkParam : null;
  };

  const urlMismatch = getUrlNetworkMismatch();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setShowWalletsPopup(false);
        setShowNetworkPopup(false);
      }
    };

    if (showWalletsPopup || showNetworkPopup) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showWalletsPopup, showNetworkPopup]);

  useEffect(() => {
    if (isConnected && (isSepolia || isMainnet)) {
      setShowWalletsPopup(false);
      setShowNetworkPopup(false);
    }
  }, [isConnected, isSepolia, isMainnet]);

  if (isConnected && (isSepolia || isMainnet) && !isAutoConnecting) {
    return (
      <div className="flex flex-col gap-2">
        {urlMismatch && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="text-yellow-800">
                URL specifies <strong>{urlMismatch}</strong> network, but wallet is connected to <strong>{isMainnet ? 'ethereum' : 'sepolia'}</strong>
              </span>
            </div>
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex gap-2">
            <NetworkSelect />
            <div className="py-2 px-4 rounded-lg border border-gray-300 font-medium">
              {address ? shortAddress(address) : "Connected"}
            </div>
          </div>
          <button
            onClick={disconnectWallet}
            className="text-red-600 hover:text-red-700 
              border border-red-300 bg-white rounded-lg py-2 px-4
              hover:bg-red-50 hover:border-red-300 
              transition-all duration-200 disabled:opacity-50 font-medium
            "
          >
            Disconnect
          </button>
        </div>
      </div>
    );
  }

  if (isConnected && !isSepolia && !isMainnet && !isAutoConnecting) {
    return (
      <div className="relative" ref={popupRef}>
        <div className="py-2 px-4 font-semibold text-red-600">
          Wrong Network
        </div>
        
        <NetworkSwitchPopup 
          isOpen={true} 
          onClose={() => setShowNetworkPopup(false)} 
        />
      </div>
    );
  }

  if (!isConnected && !isAutoConnecting && wallets && wallets.length > 0) {
    return (
      <div className="relative" ref={popupRef}>
        <button
          onClick={() => setShowWalletsPopup(!showWalletsPopup)}
          disabled={!!connectingWalletId || !wallets || wallets.length === 0}
          className="
            py-2 px-4 font-medium text-white bg-indigo-600
            rounded-lg disabled:opacity-50
            transition-all duration-200 ease-in-out
            focus:outline-none focus:ring-0 active:outline-none active:ring-0
          "
        >
          {connectingWalletId ? "Connecting..." : "Connect Wallet"}
        </button>
        
        <WalletsPopup 
          isOpen={showWalletsPopup} 
        />
      </div>
    );
  }

  return null;
}