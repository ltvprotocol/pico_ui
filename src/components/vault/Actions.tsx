import { useState } from 'react';
import Tabs from '@/components/ui/Tabs';
import ActionWrapper from '@/components/actions/ActionWrapper';
import { ActionType } from '@/types/actions';
import DexLink from './DexLink';

export default function Actions() {
  const [activeTab, setActiveTab] = useState<ActionType>('deposit');

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />
      <ActionWrapper actionType={activeTab} />
      <DexLink />
    </div>
  );
}
