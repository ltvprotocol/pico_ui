import { useState } from 'react';
import { SelectToken } from '@/components/ui';
import WithdrawBorrow from './WithdrawBorrow';
import WithdrawCollateral from './WithdrawCollateral';
import { useVaultContext } from '@/contexts';

export default function Withdraw() {
  const [selectedToken, setSelectedToken] = useState('borrow');
  const { borrowTokenSymbol, collateralTokenSymbol } = useVaultContext();

  return (
    <div className="mt-8 p-3">
      <h2 className="text-2xl font-bold mb-6 text-gray-900">Withdraw Assets</h2>
      <SelectToken
        label="Select Asset to Receive"
        borrow={borrowTokenSymbol ? borrowTokenSymbol : "Borrow"}
        collateral={collateralTokenSymbol ? collateralTokenSymbol : "Collateral"}
        selected={selectedToken}
        onSelect={setSelectedToken}
      />
      {selectedToken == 'borrow' ? <WithdrawBorrow /> : <WithdrawCollateral />}
    </div>
  );
};