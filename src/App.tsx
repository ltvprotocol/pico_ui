import { useEffect, useState } from 'react';
import ConnectWallet from '@/components/ConnectWallet';
import VaultInfo from '@/components/VaultInfo';
import Deposit from '@/components/Deposit';
import Redeem from '@/components/Redeem';
import { SEPOLIA_CHAIN_ID } from '@/constants';
import { useAppContext } from '@/context/AppContext';

function App() {
  const [isSepolia, setIsSepolia] = useState(false);

  const [vaultMaxDeposit, setVaultMaxDeposit] = useState<string>('0');
  const [vaultMaxRedeem, setVaultMaxRedeem] = useState<string>('0');
  const [ethBalance, setEthBalance] = useState<string>('0');
  const [wethBalance, setWethBalance] = useState<string>('0');
  const [gmeBalance, setGmeBalance] = useState<string>('0');
  const [activeTab, setActiveTab] = useState<'deposit' | 'redeem'>('deposit');

  const { isConnected, chainId } = useAppContext();

  useEffect(() => {
    setIsSepolia(chainId === SEPOLIA_CHAIN_ID);
  }, [isConnected, chainId]);

  const handleVaultInfo = (maxDeposit: string) => {
    setVaultMaxDeposit(maxDeposit)
  };

  const handleVaultRedeem = (balance: string) => {
    setVaultMaxRedeem(balance)
  };

  const handleEthBalance = (balance: string) => {
    setEthBalance(balance)
  };

  const handleWethBalance = (balance: string) => {
    setWethBalance(balance)
  };

  const handleGmeBalance = (balance: string) => {
    setGmeBalance(balance)
  };

  return (
    <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center">
      <div className="relative py-3 max-w-xl mx-auto">
        <div className="relative px-4 py-10 bg-white mx-8 shadow rounded-3xl p-10">
          <div className="max-w-md mx-auto">
            <div className="divide-y divide-gray-200">
              <div className="py-8 text-base leading-6 space-y-4 text-gray-700">
                <ConnectWallet
                  onEthBalance={handleEthBalance}
                  onWethBalance={handleWethBalance}
                  onGmeBalance={handleGmeBalance}
                />
                {isConnected && isSepolia && (
                  <>
                    <VaultInfo
                      onMaxDeposit={handleVaultInfo}
                      onMaxRedeem={handleVaultRedeem}
                    />
                    <div className="mt-8">
                      <div className="flex space-x-4 mb-6">
                        <button
                          onClick={() => setActiveTab('deposit')}
                          className={`flex-1 py-2 px-4 rounded-lg font-medium ${
                            activeTab === 'deposit'
                              ? 'bg-indigo-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          Deposit
                        </button>
                        <button
                          onClick={() => setActiveTab('redeem')}
                          className={`flex-1 py-2 px-4 rounded-lg font-medium ${
                            activeTab === 'redeem'
                              ? 'bg-indigo-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          Redeem
                        </button>
                      </div>
                      {activeTab === 'deposit' ? (
                        <Deposit
                          vaultMaxDeposit={vaultMaxDeposit}
                          ethBalance={ethBalance}
                          wethBalance={wethBalance}
                        />
                      ) : (
                        <Redeem
                          vaultMaxRedeem={vaultMaxRedeem}
                          gmeBalance={gmeBalance}
                        />
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
