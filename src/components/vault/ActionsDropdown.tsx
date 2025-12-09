import { useState } from 'react';
import Tabs from '@/components/ui/Tabs';
import ActionWrapper from '@/components/actions/ActionWrapper';
import { ActionType } from '@/types/actions';
import DexLink from './DexLink';

interface ActionsProps {
  isSafe?: boolean;
}

export default function ActionsDropdown({ isSafe = false } : ActionsProps ) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ActionType>('deposit');

  return (
    <div className="relative rounded-lg bg-gray-50 mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-gray-100 flex items-center justify-between p-3 text-left hover:bg-gray-100 transition-colors rounded-lg focus:outline-none focus:ring-0"
      >
        <span className="text-lg font-medium text-gray-900">ERC4626 Vault Actions</span>
        <svg
          className={`w-5 h-5 text-gray-600 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''
            }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div
        className={`transition-all duration-200 overflow-hidden ${isOpen ? 'max-h-[2000px] opacity-100 p-3' : 'max-h-0 opacity-0 pb-0'
          }`}
      >
        <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />
        <ActionWrapper actionType={activeTab} isSafe={isSafe} />
        <DexLink />
      </div>
    </div>
  );
}

export function Actions({ isSafe = false }: ActionsProps) {
  const [activeTab, setActiveTab] = useState<ActionType>('deposit');

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />
      <ActionWrapper actionType={activeTab} isSafe={isSafe} />
      <DexLink />
    </div>
  );
}