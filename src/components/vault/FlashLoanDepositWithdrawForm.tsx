import { useState } from 'react';
import Tabs from '@/components/ui/Tabs';
import FlashLoanDepositWithdrawHandler from './FlashLoanDepositWithdrawHandler';
import { useVaultContext } from '@/contexts';

type ActionType = 'deposit' | 'withdraw';

export default function FlashLoanDepositWithdrawForm() {
  const { isVaultDeleveraged } = useVaultContext();

  const tabs : { value: ActionType; label: string }[] = isVaultDeleveraged
    ? [{ value: 'withdraw', label: 'Withdraw' }]
    : [
        { value: 'deposit', label: 'Deposit' },
        { value: 'withdraw', label: 'Withdraw' }
      ];

  const [activeTab, setActiveTab] = useState<ActionType>(tabs[0]?.value || 'deposit');
  const [isProcessing, setIsProcessing] = useState(false);

  return (
    <div className="relative rounded-lg bg-gray-50 mb-4">
      <div
        className={"transition-all duration-200 overflow-hidden max-h-[2000px] opacity-100 p-3"}
      >
        {tabs.length > 1 && (
          <div className="mb-3">
            <Tabs
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              tabs={tabs}
              isProcessing={isProcessing}
            />
          </div>
        )}
        <FlashLoanDepositWithdrawHandler
          actionType={isVaultDeleveraged ? 'withdraw' : activeTab}
          setIsProcessing={setIsProcessing}
        />
      </div>
    </div>
  );
}
