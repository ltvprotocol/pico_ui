import { useAppContext } from '@/contexts';
import { useState, useRef, useEffect } from 'react';
import { shortAddress } from '@/utils';
import WalletsPopup from './WalletsPopup';
import NetworkSwitchPopup from './NetworkSwitchPopup';

export default function ConnectWallet() {
  const {
    isConnected, isAutoConnecting, isSepolia, 
    address, wallets, connectingWalletId, disconnectWallet
  } = useAppContext();

  const [showWalletsPopup, setShowWalletsPopup] = useState<boolean>(false);
  const [showNetworkPopup, setShowNetworkPopup] = useState<boolean>(false);
  const popupRef = useRef<HTMLDivElement>(null);

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
    if (isConnected && isSepolia) {
      setShowWalletsPopup(false);
      setShowNetworkPopup(false);
    }
  }, [isConnected, isSepolia]);

  if (isConnected && isSepolia && !isAutoConnecting) {
    return (
      <div className="flex gap-2">
        <div className="flex items-center gap-2 py-2 px-4 rounded-3xl border border-gray-300 font-medium">
          <img src="eth.png" alt="Sepolia" className="w-4 h-4" /> Sepolia
        </div>
        <div className="py-2 px-4 rounded-3xl border border-gray-300 font-medium">
          {address ? shortAddress(address) : "Connected"}
        </div>
        <button
          onClick={disconnectWallet}
          className=" text-red-600 hover:text-red-700 
            border border-red-300 bg-white rounded-3xl py-2 px-4
            hover:bg-red-50 hover:border-red-300 
            transition-all duration-200 disabled:opacity-50 font-medium
          "
        >
          Disconnect
        </button>
      </div>
    );
  }

  if (isConnected && !isSepolia && !isAutoConnecting) {
    return (
      <div className="relative" ref={popupRef}>
        <button
          onClick={() => setShowNetworkPopup(!showNetworkPopup)}
          className="
            py-2 px-4 font-semibold text-white bg-orange-500 
            hover:from-amber-600 hover:to-orange-600
            rounded-3xl transition-all duration-200 ease-in-out
            focus:outline-none focus:ring-0 active:outline-none active:ring-0
          "
        >
          Switch Network
        </button>
        
        <NetworkSwitchPopup 
          isOpen={showNetworkPopup} 
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
            rounded-3xl disabled:opacity-50
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