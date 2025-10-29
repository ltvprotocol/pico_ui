import { useState, useRef, useEffect } from 'react';
import { useAppContext } from '@/contexts';

interface NetworkOption {
  chainId: string;
  name: string;
  icon: string;
}

const NETWORK_OPTIONS: NetworkOption[] = [
  {
    chainId: '11155111',
    name: 'Sepolia',
    icon: 'eth.png'
  },
  {
    chainId: '1',
    name: 'Ethereum',
    icon: 'eth.png'
  }
];

export default function NetworkSelect() {
  const { currentNetwork, switchToNetwork, connectingWalletId } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);

  const currentOption = NETWORK_OPTIONS.find(option => option.chainId === currentNetwork) || NETWORK_OPTIONS[0]; // Default to Sepolia

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleNetworkChange = async (chainId: string) => {
    if (chainId !== currentNetwork && currentNetwork) {
      await switchToNetwork(chainId);
    }
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={selectRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={!!connectingWalletId}
        className="
          flex items-center gap-2 py-2 px-4 rounded-lg border border-gray-300 
          font-medium bg-white hover:bg-gray-50 transition-all duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
          focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:ring-opacity-50
          min-w-[120px] justify-between
        "
      >
        <img 
          src={currentOption?.icon} 
          alt={currentOption?.name} 
          className="w-4 h-4" 
        />
        <span>{currentOption?.name}</span>
        <svg 
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="
          absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 
          rounded-lg shadow-lg z-50 overflow-hidden min-w-[120px]
        ">
          {NETWORK_OPTIONS.map((option) => (
            <button
              key={option.chainId}
              onClick={() => handleNetworkChange(option.chainId)}
              disabled={!!connectingWalletId}
              className={`
                w-full rounded-none bg-white flex items-center gap-3 px-4 py-3 text-left
                transition-colors duration-150 hover:border-0
                disabled:opacity-50 disabled:cursor-not-allowed border-0 hover:border-0
                focus:outline-none focus:ring-0
                ${option.chainId === currentNetwork 
                  ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-500 hover:border-0 hover:border-l-4' 
                  : 'hover:bg-gray-200 text-gray-700 hover:border-0'
                }
              `}
            >
              <img 
                src={option.icon} 
                alt={option.name} 
                className="w-4 h-4" 
              />
              <span className="font-medium">{option.name}</span>
              {option.chainId === currentNetwork && (
                <svg className="w-4 h-4 ml-auto text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
