import { useState } from 'react';
import { SelectToken } from '@/components/ui';
import MintBorrow from './MintBorrow';
import MintCollateral from './MintCollateral';
import { useVaultContext } from '@/contexts';

export default function Mint() {
  const [selectedToken, setSelectedToken] = useState('borrow');
  const { borrowTokenSymbol, collateralTokenSymbol } = useVaultContext();

  return (
    <div className="mt-8 p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-900">Mint Assets</h2>
      <SelectToken
        label="Select Asset You Provide"
        borrow={borrowTokenSymbol}
        collateral={collateralTokenSymbol}
        selected={selectedToken}
        onSelect={setSelectedToken}
      />
      {selectedToken == 'borrow' ? <MintBorrow /> : <MintCollateral />}
    </div>
  );
};