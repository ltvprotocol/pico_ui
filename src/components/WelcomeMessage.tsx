export default function WelcomeMessage() {
  return (
    <div className="relative py-3 w-full mx-auto px-4 [@media(min-width:450px)]:max-w-[430px]">
      <div className="relative px-6 py-8 bg-white shadow rounded-3xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Welcome to LTV Protocol
        </h1>
        <p className="text-gray-700 mb-6">
          To start using the vaults, you'll need to connect your wallet first.
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg 
              className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" 
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-blue-800">
              Make sure you have MetaMask or other wallet installed and are connected to the Sepolia or Ethereum network.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
