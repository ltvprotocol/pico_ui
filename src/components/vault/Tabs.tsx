import { useState } from 'react';
import { Deposit, Withdraw, Mint, Redeem } from '@/components/actions';

type Tabs = 'deposit' | 'redeem' | 'mint' | 'withdraw';

export default function Tabs() {
  const [activeTab, setActiveTab] = useState<Tabs>('deposit');

  const tabClass = (tab: Tabs) =>
  `flex-1 py-2 px-4 rounded-lg font-medium transition-colors focus:outline-none focus:ring-0 ${
    activeTab === tab
      ? 'bg-indigo-600 text-white'
      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
  }`;

  return (
    <div className="mt-8">
      <div className="flex space-x-4 mb-3">
        <button onClick={() => setActiveTab('deposit')} className={tabClass('deposit')}>
          Deposit
        </button>
        <button onClick={() => setActiveTab('redeem')} className={tabClass('redeem')}>
          Redeem
        </button>
      </div>
      <div className="flex space-x-4 mb-6">
        <button onClick={() => setActiveTab('mint')} className={tabClass('mint')}>
          Mint
        </button>
        <button onClick={() => setActiveTab('withdraw')} className={tabClass('withdraw')}>
          Withdraw
        </button>
      </div>

      <div>
        {activeTab === 'deposit' && <Deposit />}
        {activeTab === 'redeem' && <Redeem />}
        {activeTab === 'mint' && <Mint />}
        {activeTab === 'withdraw' && <Withdraw />}
      </div>
    </div>
  );
}