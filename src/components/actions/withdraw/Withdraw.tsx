import { useState } from 'react';
import { SelectToken } from '@/components/ui';
import WithdrawBorrow from './WithdrawBorrow';
import WithdrawCollateral from './WithdrawCollateral';
import { useVaultContext } from '@/contexts';

export default function Withdraw() {
  const [selectedToken, setSelectedToken] = useState('borrow');
  const { borrowTokenSymbol, collateralTokenSymbol } = useVaultContext();

  return (
    <div className="mt-8 p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-900">Withdraw Assets</h2>
      <SelectToken
        borrow={borrowTokenSymbol}
        collateral={collateralTokenSymbol}
        selected={selectedToken}
        onSelect={setSelectedToken}
      />
      {selectedToken == 'borrow' ? <WithdrawBorrow /> : <WithdrawCollateral />}
    </div>
  );
};