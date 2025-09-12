import { useState } from 'react';
import { SelectToken } from '@/components/ui';
import RedeemBorrow from './RedeemBorrow';
import RedeemCollateral from './RedeemCollateral';
import { useVaultContext } from '@/contexts';

export default function Mint() {
  const [selectedToken, setSelectedToken] = useState('borrow');
  const { borrowTokenSymbol, collateralTokenSymbol } = useVaultContext();

  return (
    <div className="mt-8 p-3">
      <h2 className="text-2xl font-bold mb-6 text-gray-900">Redeem Shares</h2>
      <SelectToken
        label="Select Asset to Receive"
        borrow={borrowTokenSymbol ? borrowTokenSymbol : "Borrow"}
        collateral={collateralTokenSymbol ? collateralTokenSymbol : "Collateral"}
        selected={selectedToken}
        onSelect={setSelectedToken}
      />
      {selectedToken == 'borrow' ? <RedeemBorrow /> : <RedeemCollateral />}
    </div>
  );
};