import { useState } from 'react';
import Deposit from '@/components/Deposit';
import Redeem from '@/components/Redeem';

export default function DepositRedeemTabs() {
  const [activeTab, setActiveTab] = useState<'deposit' | 'redeem'>('deposit');

  return (
    <div className="mt-8">
      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setActiveTab('deposit')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium ${
            activeTab === 'deposit'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Deposit
        </button>
        <button
          onClick={() => setActiveTab('redeem')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium ${
            activeTab === 'redeem'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Redeem
        </button>
      </div>
      {activeTab === 'deposit' ? (
        <Deposit />
      ) : (
        <Redeem />
      )}
    </div>
  )
}