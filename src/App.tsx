import Deposit from './components/Deposit'

function App() {
  // Replace these with actual contract addresses from the testnet
  //const vaultAddress = '0x...' // Add your vault contract address
  //const assetAddress = '0x...' // Add your asset token address

  return (
    <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center">
      <div className="relative py-3 max-w-xl mx-auto">
        <div className="relative px-4 py-10 bg-white mx-8 shadow rounded-3xl p-10">
          <div className="max-w-md mx-auto">
            <div className="divide-y divide-gray-200">
              <div className="py-8 text-base leading-6 space-y-4 text-gray-700">
                <Deposit />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
