import { useState } from 'react';
import Tabs from '@/components/ui/Tabs';
import ActionWrapper from '@/components/actions/ActionWrapper';
import { ActionType } from '@/types/actions';
import DexLink from './DexLink';

export default function Actions() {
  const [activeTab, setActiveTab] = useState<ActionType>('deposit');

  return (
    <div className="mt-8">
      <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />
      <ActionWrapper actionType={activeTab} />
      <DexLink />
    </div>
  );
}
