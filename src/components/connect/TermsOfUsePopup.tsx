import { useAppContext } from '@/contexts';

interface TermsOfUsePopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TermsOfUsePopup({ isOpen }: TermsOfUsePopupProps) {
  const { signTermsOfUse, isSigningTerms, termsError } = useAppContext();

  if (!isOpen) return null;

  const handleSign = async () => {
    await signTermsOfUse();
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
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                <svg className="h-5 w-5 text-orange-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 mb-1">Terms of Use Required</p>
              <p className="text-xs text-gray-500 leading-relaxed">
                {termsError || 'Please sign the terms of use to access the application.'}
              </p>
            </div>
          </div>
          
          <button
            onClick={handleSign}
            disabled={isSigningTerms}
            className="
              w-full flex justify-center items-center space-x-2 py-2 px-4
              bg-indigo-600 hover:bg-indigo-700
              text-white font-medium rounded-lg
              transition-all duration-200 ease-in-out
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            {isSigningTerms ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Signing...</span>
              </>
            ) : (
              <span>Sign Terms of Use</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
