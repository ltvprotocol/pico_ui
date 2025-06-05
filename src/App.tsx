import { useState } from 'react'
import WalletConnect from './components/WalletConnect'
import VaultInfo from './components/VaultInfo'
import Deposit from './components/Deposit'
import Redeem from './components/Redeem'
import { ethers } from 'ethers'

function App() {
  const [isWalletConnected, setIsWalletConnected] = useState(false)
  const [isSepolia, setIsSepolia] = useState(false)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [ethersProvider, setProvider] = useState<ethers.BrowserProvider | null>(null)
  const [ethersSigner, setSigner] = useState<ethers.JsonRpcSigner | null>(null)
  const [vaultMaxDeposit, setVaultMaxDeposit] = useState<string>('0')
  const [vaultMaxRedeem, setVaultMaxRedeem] = useState<string>('0')
  const [ethBalance, setEthBalance] = useState<string>('0')
  const [wethBalance, setWethBalance] = useState<string>('0')
  const [gmeBalance, setGmeBalance] = useState<string>('0')
  const [activeTab, setActiveTab] = useState<'deposit' | 'redeem'>('deposit')

  const handleWalletConnect = (
    provider: ethers.BrowserProvider | null,
    signer: ethers.JsonRpcSigner | null,
    address: string | null
  ) => {
    setIsWalletConnected(!!address)
    setWalletAddress(address)
    setProvider(provider);
    setSigner(signer);
  }

  const handleNetworkChange = (isSepoliaNetwork: boolean) => {
    setIsSepolia(isSepoliaNetwork)
  }

  const handleVaultInfo = (maxDeposit: string) => {
    setVaultMaxDeposit(maxDeposit)
  }

  const handleVaultRedeem = (balance: string) => {
    setVaultMaxRedeem(balance)
  }

  const handleEthBalance = (balance: string) => {
    setEthBalance(balance)
  }

  const handleWethBalance = (balance: string) => {
    setWethBalance(balance)
  }

  const handleGmeBalance = (balance: string) => {
    setGmeBalance(balance)
  }

  return (
    <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center">
      <div className="relative py-3 max-w-xl mx-auto">
        <div className="relative px-4 py-10 bg-white mx-8 shadow rounded-3xl p-10">
          <div className="max-w-md mx-auto">
            <div className="divide-y divide-gray-200">
              <div className="py-8 text-base leading-6 space-y-4 text-gray-700">
                <WalletConnect
                  onConnect={handleWalletConnect}
                  onNetworkChange={handleNetworkChange}
                  onEthBalance={handleEthBalance}
                  onWethBalance={handleWethBalance}
                  onGmeBalance={handleGmeBalance}
                />
                <VaultInfo
                  isConnected={isWalletConnected}
                  isSepolia={isSepolia}
                  address={walletAddress}
                  provider={ethersProvider}
                  onMaxDeposit={handleVaultInfo}
                  onMaxRedeem={handleVaultRedeem}
                />
                <div className="mt-8">
                  {/* Toggle Buttons */}
                  {isWalletConnected && isSepolia && (
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
                  )}

                  {/* Content */}
                  {activeTab === 'deposit' ? (
                    <Deposit
                      isWalletConnected={isWalletConnected}
                      isSepolia={isSepolia}
                      address={walletAddress}
                      provider={ethersProvider}
                      signer={ethersSigner}
                      vaultMaxDeposit={vaultMaxDeposit}
                      ethBalance={ethBalance}
                      wethBalance={wethBalance}
                    />
                  ) : (
                    <Redeem
                      isWalletConnected={isWalletConnected}
                      isSepolia={isSepolia}
                      address={walletAddress}
                      provider={ethersProvider}
                      signer={ethersSigner}
                      vaultMaxRedeem={vaultMaxRedeem}
                      gmeBalance={gmeBalance}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
