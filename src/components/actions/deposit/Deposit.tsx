import { useState } from 'react';
import { SelectToken } from '@/components/ui';
import DepositBorrow from './DepositBorrow';
import DepositCollateral from './DepositCollateral';
import { useVaultContext } from '@/contexts';

export default function Deposit() {
  const [selectedToken, setSelectedToken] = useState('borrow');
  const { borrowTokenSymbol, collateralTokenSymbol } = useVaultContext();

  return (
    <div className="mt-8 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-900">Deposit Assets</h2>
      <SelectToken
        label="Select Asset You Provide"
        borrow={borrowTokenSymbol}
        collateral={collateralTokenSymbol}
        selected={selectedToken}
        onSelect={setSelectedToken}
      />
      {selectedToken == 'borrow' ? <DepositBorrow /> : <DepositCollateral />}
    </div>
  );
};