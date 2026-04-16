interface SettingsHeaderProps {
  title: string;
  onClose: () => void;
  onBack?: () => void;
}

export function SettingsHeader({ title, onClose, onBack }: SettingsHeaderProps) {
  return (
    <div className="flex justify-between items-center mb-3">
      <div className="flex items-center">
        {onBack && (
          <button onClick={onBack} className="mr-2 text-gray-500 hover:text-gray-700 bg-white rounded-md p-1 hover:bg-gray-50 border border-transparent hover:border-gray-200">
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </button>
        )}
        <span className="font-medium text-gray-900">{title}</span>
      </div>
      <button onClick={onClose} className="text-gray-400 hover:text-gray-600 bg-white rounded-md p-1 hover:bg-gray-50">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};
