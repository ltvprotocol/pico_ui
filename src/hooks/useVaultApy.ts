import { useState, useCallback } from 'react';
import { fetchApy } from '@/utils';
import { ApyData } from '@/utils/api';

export function useVaultApy() {
  const [apy, setApy] = useState<ApyData | null>(null);
  const [isLoadingApy, setIsLoadingApy] = useState(false);
  const [apyLoadFailed, setApyLoadFailed] = useState(false);

  const loadApy = useCallback(async (addr: string, network: string, initialApy?: ApyData | null) => {
    if (initialApy !== undefined && initialApy !== null) {
      setApy(initialApy);
      setApyLoadFailed(false);
      return;
    }

    try {
      setIsLoadingApy(true);
      setApyLoadFailed(false);
      const result = await fetchApy(addr, network);
      setApy(result);
      setApyLoadFailed(result === null);
    } catch (err) {
      console.error('Error loading APY:', err);
      setApyLoadFailed(true);
    } finally {
      setIsLoadingApy(false);
    }
  }, []);

  return { apy, isLoadingApy, apyLoadFailed, loadApy };
}
