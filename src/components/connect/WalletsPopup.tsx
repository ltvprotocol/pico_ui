import { useAppContext } from '@/contexts';

interface WalletsPopupProps {
  isOpen: boolean;
}

export default function WalletsPopup({ isOpen }: WalletsPopupProps) {
  const { wallets, connectingWalletId, connectWallet } = useAppContext();

  if (!isOpen) return null;

  const hasWallets = wallets && wallets.length > 0;

  return (
    <div className="
      absolute top-[65px] right-0 bg-white rounded-lg
      min-w-[320px] z-50 overflow-hidden shadow-lg
    ">
      <div className="p-4">
        {hasWallets ? (
          <>
            <div className="text-gray-400 font-medium text-sm mb-2">Select a Wallet</div>
            <div className="space-y-3">
              {wallets.map((wallet) => (
                <button
                  key={wallet.info.uuid}
                  onClick={() => connectWallet(wallet)}
                  disabled={!!connectingWalletId}
                  className="
                    text-gray-600 w-full flex justify-center items-center space-x-2 py-2 px-4
                    border border-blue-300 bg-white dark:bg-white rounded-lg
                    hover:bg-blue-50 dark:hover:bg-blue-50 hover:border-blue-600 
                    transition disabled:opacity-50
                  "
                >
                  <img src={wallet.info.icon} alt={wallet.info.name} className="w-6 h-6"/>
                  <span>
                    {connectingWalletId === wallet.info.uuid
                      ? 'Connecting...' 
                      : wallet.info.name
                    }
                  </span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div className="text-gray-400 font-medium text-sm mb-2">Select a Wallet</div>
            <div className="flex flex-col items-center space-y-3 py-4">
              <div className="text-center">
                <p className="text-gray-600 font-medium mb-1">No wallets discovered</p>
                <p className="text-gray-500 text-sm mb-4">
                  Please install a wallet extension to connect
                </p>
              </div>
              <a
                href="https://metamask.io"
                target="_blank"
                rel="noopener noreferrer"
                className="
                  w-full flex justify-center items-center py-2 px-4
                  bg-orange-500 hover:bg-orange-600
                  text-white font-medium rounded-lg hover:text-white
                  transition-all duration-200 ease-in-out
                "
              >
                Install MetaMask
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
