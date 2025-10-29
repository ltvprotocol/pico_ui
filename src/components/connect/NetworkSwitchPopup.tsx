import { useCallback } from 'react';
import { useAppContext } from '@/contexts';

interface NetworkSwitchPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NetworkSwitchPopup({ isOpen, onClose }: NetworkSwitchPopupProps) {
  const { connectingWalletId, switchToSepolia, switchToMainnet } = useAppContext();

  const handleSwitchToSepolia = useCallback(async () => {
    await switchToSepolia();
    onClose();
  }, [switchToSepolia, onClose]);

  const handleSwitchToMainnet = useCallback(async () => {
    await switchToMainnet();
    onClose();
  }, [switchToMainnet, onClose]);

  if (!isOpen) return null;

  return (
    <div className="
      absolute top-[65px] right-0 bg-white rounded-lg
      min-w-[320px] z-50 overflow-hidden
    ">
      <div className="p-1">
        <div className="p-4">
          <div className="flex items-start space-x-3 mb-4">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                <svg className="h-5 w-5 text-orange-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-500 leading-relaxed">
                You're connected to the wrong network. Please switch to Sepolia testnet or Ethereum mainnet to continue using the application.
              </p>
            </div>
          </div>
          
          <div className="space-y-2">
            <button
              onClick={handleSwitchToSepolia}
              disabled={!!connectingWalletId}
              className="
                w-full flex justify-center items-center space-x-2 py-2 px-4
                bg-indigo-600
                text-white font-medium rounded-lg
                transition-all duration-200 ease-in-out
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            >
              {connectingWalletId ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Switching...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Switch to Sepolia</span>
                </>
              )}
            </button>
            
            <button
              onClick={handleSwitchToMainnet}
              disabled={!!connectingWalletId}
              className="
                w-full flex justify-center items-center space-x-2 py-2 px-4
                bg-green-600
                text-white font-medium rounded-lg
                transition-all duration-200 ease-in-out
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            >
              {connectingWalletId ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Switching...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Switch to Ethereum</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
