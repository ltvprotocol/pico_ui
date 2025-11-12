import { useVaultContext } from '@/contexts';

export default function WhitelistBanner() {
  const {
    isWhitelistActivated,
    isWhitelisted,
    hasSignature,
    activateWhitelist,
    isActivatingWhitelist,
    whitelistError,
  } = useVaultContext();

  // Don't show banner if whitelist is not activated (everyone is whitelisted)
  if (isWhitelistActivated === false || isWhitelistActivated === null) {
    return null;
  }

  // Don't show banner if user is whitelisted
  if (isWhitelisted === true) {
    return null;
  }

  // Don't show banner while checking whitelist status (wait for confirmation)
  if (isWhitelisted === null) {
    return null;
  }

  // Show banner only when we confirmed user is NOT whitelisted (isWhitelisted === false)
  return (
    <div className="mb-4">
      {!hasSignature ? (
        <div className="bg-red-100 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg 
              className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" 
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              <path 
                fillRule="evenodd" 
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" 
                clipRule="evenodd" 
              />
            </svg>
            <div className="flex-1">
              <p className="text-sm text-red-800 font-medium">
                You're not whitelisted
              </p>
              <p className="text-sm text-red-700 mt-1">
                Your address is not whitelisted to use this vault. Please contact the team to request whitelist access.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg 
                className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" 
                fill="currentColor" 
                viewBox="0 0 20 20"
              >
                <path 
                  fillRule="evenodd" 
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" 
                  clipRule="evenodd" 
                />
              </svg>
              <div className="flex-1">
                <p className="text-sm text-green-800 font-medium">
                  You're whitelisted
                </p>
                <p className="text-sm text-green-700 mt-1">
                  You have a whitelist signature. Click the button below to activate your whitelist access.
                </p>
              </div>
            </div>
          </div>

          {whitelistError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg 
                  className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" 
                  fill="currentColor" 
                  viewBox="0 0 20 20"
                >
                  <path 
                    fillRule="evenodd" 
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" 
                    clipRule="evenodd" 
                  />
                </svg>
                <p className="text-sm text-red-800">
                  {whitelistError}
                </p>
              </div>
            </div>
          )}

          <button
            onClick={activateWhitelist}
            disabled={isActivatingWhitelist}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
          >
            {isActivatingWhitelist ? (
              <>
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Activating Whitelist...</span>
              </>
            ) : (
              <span>Activate Whitelist</span>
            )}
          </button>

          <p className="text-xs text-gray-500 text-center">
            This will submit a transaction to the blockchain. You can only use this signature once.
          </p>
        </div>
      )}
    </div>
  );
}
