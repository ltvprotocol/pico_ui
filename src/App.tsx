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
  const [vaultMaxDeposit, setVaultMaxDeposit] = useState<string>('0')
  const [vaultMaxRedeem, setVaultMaxRedeem] = useState<string>('0')
  const [ethBalance, setEthBalance] = useState<string>('0')
  const [wethBalance, setWethBalance] = useState<string>('0')
  const [gmeBalance, setGmeBalance] = useState<string>('0')

  const handleWalletConnect = (address: string | null) => {
    setIsWalletConnected(!!address)
    setWalletAddress(address)
  }

  const handleNetworkChange = (isSepoliaNetwork: boolean) => {
    setIsSepolia(isSepoliaNetwork)
  }

  const handleVaultInfo = (maxDeposit: ethers.BigNumber) => {
    setVaultMaxDeposit(maxDeposit.toHexString())
  }

  const handleVaultRedeem = (balance: ethers.BigNumber) => {
    setVaultMaxRedeem(balance.toHexString())
  }

  const handleEthBalance = (balance: string) => {
    setEthBalance(balance)
  }

  const handleWethBalance = (balance: ethers.BigNumber) => {
    setWethBalance(balance.toHexString())
  }

  const handleGmeBalance = (balance: ethers.BigNumber) => {
    setGmeBalance(balance.toHexString())
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
                  onMaxDeposit={handleVaultInfo}
                  onMaxRedeem={handleVaultRedeem}
                />
                <Deposit
                  isWalletConnected={isWalletConnected}
                  isSepolia={isSepolia}
                  walletAddress={walletAddress}
                  vaultMaxDeposit={vaultMaxDeposit}
                  ethBalance={ethBalance}
                  wethBalance={wethBalance}
                />
                <div className="mt-8">
                  <Redeem
                    isWalletConnected={isWalletConnected}
                    isSepolia={isSepolia}
                    walletAddress={walletAddress}
                    vaultMaxRedeem={vaultMaxRedeem}
                    gmeBalance={gmeBalance}
                  />
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
