import { useAppContext } from '@/contexts';

interface WalletsPopupProps {
  isOpen: boolean;
}

export default function WalletsPopup({ isOpen }: WalletsPopupProps) {
  const { wallets, connectingWalletId, connectWallet } = useAppContext();

  if (!isOpen) return null;

  return (
    <div className="
      absolute top-full top-[79px] right-0 bg-white rounded-3xl
      min-w-[320px] z-50 overflow-hidden
    ">
      <div className="p-4">
        <div className="text-gray-400 font-medium text-sm mb-2">Select a Wallet</div>
        <div className="space-y-3">
          {wallets?.map((wallet, ) => (
            <button
              key={wallet.info.uuid}
              onClick={() => connectWallet(wallet)}
              disabled={!!connectingWalletId}
              className="
                text-gray-600 w-full flex justify-center items-center space-x-2 py-2 px-4
                border border-blue-300 bg-white dark:bg-white rounded-3xl
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
      </div>
    </div>
  );
}
