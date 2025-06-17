import { useState } from 'react';
import { SelectToken } from '@/components/ui';
import RedeemBorrow from './RedeemBorrow';
import RedeemCollateral from './RedeemCollateral';
import { useVaultContext } from '@/contexts';

export default function Mint() {
  const [selectedToken, setSelectedToken] = useState('borrow');
  const { borrowTokenSymbol, collateralTokenSymbol } = useVaultContext();

  return (
    <div className="mt-8 p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-900">Redeem Assets</h2>
      <SelectToken
        actionTitle="Redeem"
        borrow={borrowTokenSymbol}
        collateral={collateralTokenSymbol}
        selected={selectedToken}
        onSelect={setSelectedToken}
      />
      {selectedToken == 'borrow' ? <RedeemBorrow /> : <RedeemCollateral />}
    </div>
  );
};