import { useAppContext } from '@/contexts';
import { useEffect, useState } from 'react';

interface TermsOfUsePopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TermsOfUsePopup({ isOpen }: TermsOfUsePopupProps) {
  const {
    isTermsSigned,
    isSigningTerms,
    isCheckingTerms,
    termsCheckingError,
    termsTextFetchingError,
    termsSigningError,
    checkTermsStatus,
    signTermsOfUse
  } = useAppContext();

  const [isTermsError, setIsTermsError] = useState(
    termsTextFetchingError ||
    termsCheckingError ||
    termsSigningError
  );

  useEffect(() => {
    setIsTermsError(
      termsTextFetchingError ||
      termsCheckingError ||
      termsSigningError
    )
  }, [
    termsTextFetchingError,
    termsCheckingError,
    termsSigningError
  ]);

  if (!isOpen || isTermsSigned) return null;

  const handleAction = async () => {
    if (termsCheckingError) {
      await checkTermsStatus();
    } else {
      await signTermsOfUse();
    }
  };

  return (
    <div className="
      absolute top-[65px] right-0 bg-white rounded-lg
      min-w-[320px] z-50 overflow-hidden shadow-lg
    ">
      <div className="p-4">
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              {isTermsError ? (
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <svg className="h-5 w-5 text-red-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                  <svg className="h-5 w-5 text-orange-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 mb-1">
                {isTermsError ? 'Some Error Occurred' : 'Terms of Use Required'}
              </p>
              <p className="text-xs text-gray-500 leading-relaxed">
                {termsCheckingError && "Failed to check Terms Of Use signature status"}
                {!termsCheckingError && termsTextFetchingError && "Failed to fetch Terms Of Use text, please, try again later"}
                {termsSigningError && "Failed to sign Terms Of Use, please, try again"}
                {!isTermsError && "Please, sign Terms Of Use to access the application"}
              </p>
            </div>
          </div>

          <button
            onClick={handleAction}
            disabled={isSigningTerms || isCheckingTerms}
            className={`
              w-full flex justify-center items-center space-x-2 py-2 px-4
              text-white font-medium rounded-lg
              transition-all duration-200 ease-in-out
              disabled:opacity-50 disabled:cursor-not-allowed
              ${isTermsError ? 
                'bg-orange-500 hover:bg-orange-600' : 
                'bg-indigo-600 hover:bg-indigo-700'
              }
            `}
          >
            {isSigningTerms || isCheckingTerms ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>{termsCheckingError ? 'Retrying...' : 'Signing...'}</span>
              </>
            ) : (
              <span>{termsCheckingError ? 'Retry' : 'Sign Terms of Use'}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
