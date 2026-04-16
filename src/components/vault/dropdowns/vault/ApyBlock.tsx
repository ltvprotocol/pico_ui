import { useMemo } from 'react';
import { useVaultContext, useAppContext } from '@/contexts';
import { formatApy, ApyPeriod } from '@/utils';
import { ApyStat } from '@/components/ui';

export function ApyBlock() {
  const { apy, apyLoadFailed } = useVaultContext();
  const { isMainnet } = useAppContext();

  const apy30d = useMemo(() => {
    if (apyLoadFailed) return "Failed";
    if (isMainnet && apy) return formatApy(apy, ApyPeriod.ThirtyDays);
    return "Loading...";
  }, [isMainnet, apy, apyLoadFailed]);

  const apy7d = useMemo(() => {
    if (apyLoadFailed) return "Failed";
    if (isMainnet && apy) return formatApy(apy, ApyPeriod.SevenDays);
    return "Loading...";
  }, [isMainnet, apy, apyLoadFailed]);

  return (
    <div className="grid grid-cols-2 gap-6">
      <ApyStat title="30 day APY" value={apy30d} isError={apyLoadFailed} />
      <ApyStat title="7 day APY" value={apy7d} isError={apyLoadFailed} />
    </div>
  );
}
