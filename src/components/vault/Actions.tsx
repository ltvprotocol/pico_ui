import { useState } from 'react';
import Tabs from '@/components/ui/Tabs';
import ActionWrapper from '@/components/actions/ActionWrapper';
import { ActionType } from '@/types/actions';
import DexLink from './DexLink';
import { ACTIONS_TABS } from '@/constants';

interface ActionsProps {
  isSafe?: boolean;
}

export default function Actions({ isSafe = false }: ActionsProps) {
  const [activeTab, setActiveTab] = useState<ActionType>('deposit');

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <Tabs
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        tabs={ACTIONS_TABS}
      />
      <ActionWrapper actionType={activeTab} isSafe={isSafe} />
      <DexLink />
    </div>
  );
}
