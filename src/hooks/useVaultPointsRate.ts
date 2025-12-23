import { useState, useCallback } from 'react';
import { fetchPointsRate } from '@/utils';

export function useVaultPointsRate() {
  const [pointsRate, setPointsRate] = useState<number | null>(null);
  const [isLoadingPointsRate, setIsLoadingPointsRate] = useState(false);
  const [pointsRateLoadFailed, setPointsRateLoadFailed] = useState(false);

  const loadPointsRate = useCallback(async (addr: string, network: string, initialPointsRate?: number | null) => {
    if (initialPointsRate !== undefined && initialPointsRate !== null) {
      setPointsRate(initialPointsRate);
      setPointsRateLoadFailed(false);
      return;
    }

    try {
      setIsLoadingPointsRate(true);
      setPointsRateLoadFailed(false);
      const result = await fetchPointsRate(addr, network);
      setPointsRate(result);
      setPointsRateLoadFailed(result === null);
    } catch (err) {
      console.error('Error loading points rate:', err);
      setPointsRateLoadFailed(true);
    } finally {
      setIsLoadingPointsRate(false);
    }
  }, []);

  return { pointsRate, isLoadingPointsRate, pointsRateLoadFailed, loadPointsRate };
}
