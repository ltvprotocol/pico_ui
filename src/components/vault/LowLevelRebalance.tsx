import { useState } from 'react';
import Tabs from '@/components/ui/Tabs';
import LowLevelRebalanceHandler from './LowLevelRebalanceHandler';

type LowLevelRebalanceType = 'shares' | 'borrow' | 'collateral';

const LOW_LEVEL_TABS: { value: LowLevelRebalanceType; label: string }[] = [
  { value: 'shares', label: 'Shares' },
  { value: 'borrow', label: 'Borrow' },
  { value: 'collateral', label: 'Collateral' },
];

export default function LowLevelRebalance() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<LowLevelRebalanceType>('shares');

  return (
    <div className="relative rounded-lg bg-gray-50">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-gray-100 flex items-center justify-between p-3 text-left hover:bg-gray-100 transition-colors rounded-lg focus:outline-none focus:ring-0"
      >
        <span className="text-lg font-medium text-gray-900">Low Level Rebalance</span>
        <svg 
          className={`w-5 h-5 text-gray-600 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div className={`transition-all duration-200 overflow-hidden ${isOpen ? 'max-h-[2000px] opacity-100 p-3' : 'max-h-0 opacity-0 pb-0'}`}>
        <div className="mb-3">
          <Tabs 
            activeTab={activeTab} 
            setActiveTab={setActiveTab}
            tabs={LOW_LEVEL_TABS}
          />
        </div>
        <LowLevelRebalanceHandler rebalanceType={activeTab} />
      </div>
    </div>
  );
}

