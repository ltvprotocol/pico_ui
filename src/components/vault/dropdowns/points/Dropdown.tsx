import { Dropdown } from '@/components/ui';
import { PrivateLPBlock } from './PrivateLPBlock';
import { PointsBlock } from './PointsBlock';

export default function PointsDropdown() {
  return (
    <Dropdown title="Points" isOpen={true}>
      <PrivateLPBlock />
      <PointsBlock />
    </Dropdown>
  );
}
