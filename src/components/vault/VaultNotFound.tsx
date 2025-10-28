import { useVaultContext } from '@/contexts';

export default function VaultNotFound() {
  const { vaultAddress, isCheckingVaultExistence } = useVaultContext();

  if (isCheckingVaultExistence) {
    return (
      <div className="w-full flex flex-col items-center justify-center py-12">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Checking Vault...</h2>
        <p className="text-gray-600 text-center mb-6 max-w-md">
          Verifying if the vault contract exists at address <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">{vaultAddress}</code>
        </p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center justify-center py-12">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Vault Not Found</h2>
      <p className="text-gray-600 text-center mb-6 max-w-md">
        The vault contract at address <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">{vaultAddress}</code> does not exist on this network.
      </p>
      <div className="flex gap-3">
        <button
          onClick={() => window.history.back()}
          className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Go Back
        </button>
        <button
          onClick={() => window.location.href = '/'}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          View All Vaults
        </button>
      </div>
    </div>
  );
}
