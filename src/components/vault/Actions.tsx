import { useState } from 'react';
import Tabs from '@/components/ui/Tabs';
import ActionWrapper from '@/components/actions/ActionWrapper';
import { ActionType } from '@/types/actions';
import DexLink from './DexLink';

interface ActionsProps {
  className?: string;
}

export default function Actions({ className }: ActionsProps) {
  const [activeTab, setActiveTab] = useState<ActionType>('deposit');

  return (
    <div className={`bg-white rounded-lg p-4 ${className ?? ''}`}>
      <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />
      <ActionWrapper actionType={activeTab} />
      <DexLink />
    </div>
  );
}
