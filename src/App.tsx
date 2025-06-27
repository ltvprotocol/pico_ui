import { useEffect, useState } from 'react';
import ConnectWallet from '@/components/ConnectWallet';
import Balances from '@/components/Balances';
import VaultInfo from '@/components/VaultInfo';
import Tabs from '@/components/Tabs';
import { SEPOLIA_CHAIN_ID } from '@/constants';
import { useAppContext } from '@/contexts';

function App() {
  const [isSepolia, setIsSepolia] = useState(false);

  const { isConnected, chainId } = useAppContext();

  useEffect(() => {
    setIsSepolia(chainId === SEPOLIA_CHAIN_ID);
  }, [isConnected, chainId]);

  return (
    <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center">
      <div className="relative py-3 max-w-xl mx-auto">
        <div className="relative px-4 py-10 bg-white mx-8 shadow rounded-3xl p-10">
          <div className="max-w-md mx-auto">
            <div className="divide-y divide-gray-200">
              <div className="py-8 text-base leading-6 space-y-4 text-gray-700">
                <ConnectWallet />
                {isConnected && isSepolia && (
                  <>
                    <Balances />
                    <VaultInfo />
                    <Tabs />
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