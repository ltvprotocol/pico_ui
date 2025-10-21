import { useState } from 'react';
import { SelectToken } from '@/components/ui';
import ActionHandler from './ActionHandler';
import { useVaultContext } from '@/contexts';
import { ActionType, TokenType } from '@/types/actions';

interface ActionConfig {
  title: string;
  selectLabel: string;
}

const ACTION_CONFIGS: Record<ActionType, ActionConfig> = {
  deposit: {
    title: 'Deposit Assets',
    selectLabel: 'Select Asset You Provide',
  },
  mint: {
    title: 'Mint Shares',
    selectLabel: 'Select Asset You Provide',
  },
  withdraw: {
    title: 'Withdraw Assets',
    selectLabel: 'Select Asset to Receive',
  },
  redeem: {
    title: 'Redeem Shares',
    selectLabel: 'Select Asset to Receive',
  },
};

interface ActionWrapperProps {
  actionType: ActionType;
}

export default function ActionWrapper({ actionType }: ActionWrapperProps) {
  const [selectedToken, setSelectedToken] = useState<TokenType>('borrow');
  const { borrowTokenSymbol, collateralTokenSymbol } = useVaultContext();

  const config = ACTION_CONFIGS[actionType];

  return (
    <div className="py-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-900">{config.title}</h2>
      <SelectToken
        label={config.selectLabel}
        borrow={borrowTokenSymbol ?? "Borrow"}
        collateral={collateralTokenSymbol ?? "Collateral"}
        selected={selectedToken}
        onSelect={(selected) => setSelectedToken(selected as TokenType)}
      />
      <ActionHandler actionType={actionType} tokenType={selectedToken} />
    </div>
  );
}

