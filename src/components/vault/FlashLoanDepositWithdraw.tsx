import { useState, useMemo } from 'react';
import Tabs from '@/components/ui/Tabs';
import FlashLoanDepositWithdrawHandler from './FlashLoanDepositWithdrawHandler';
import { useVaultContext } from '@/contexts';

type ActionType = 'deposit' | 'withdraw';

export default function FlashLoanDepositWithdraw() {
  const { flashLoanMintHelperAddress, flashLoanRedeemHelperAddress } = useVaultContext();

  const availableTabs = useMemo(() => {
    const tabs: { value: ActionType; label: string }[] = [];

    if (flashLoanMintHelperAddress && flashLoanMintHelperAddress !== '') {
      tabs.push({ value: 'deposit', label: 'Deposit' });
    }

    if (flashLoanRedeemHelperAddress && flashLoanRedeemHelperAddress !== '') {
      tabs.push({ value: 'withdraw', label: 'Withdraw' });
    }

    return tabs;
  }, [flashLoanMintHelperAddress, flashLoanRedeemHelperAddress]);

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ActionType>(availableTabs[0]?.value || 'deposit');

  if (availableTabs.length === 0) {
    return null;
  }

  return (
    <div className="relative rounded-lg bg-gray-50 mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-gray-100 flex items-center justify-between p-3 text-left hover:bg-gray-100 transition-colors rounded-lg focus:outline-none focus:ring-0"
      >
        <span className="text-lg font-medium text-gray-900">Flash Loan Deposit/Withdraw</span>
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
        {availableTabs.length > 1 && (
          <div className="mb-3">
            <Tabs activeTab={activeTab} setActiveTab={setActiveTab} tabs={availableTabs} />
          </div>
        )}
        <FlashLoanDepositWithdrawHandler actionType={activeTab} />
      </div>
    </div>
  );
}
