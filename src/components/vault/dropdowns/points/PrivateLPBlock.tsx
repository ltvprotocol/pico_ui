import { Divider, DescriptionBlock, LabeledValue } from '@/components/ui';
import { useState, useEffect } from 'react';
import { useAppContext } from '@/contexts';
import { fetchIsLiquidityProvider } from '@/utils';

interface PrivateLPBlockProps {
  className?: string;
}

export function PrivateLPBlock({ className = "" }: PrivateLPBlockProps) {
  const { isMainnet, address } = useAppContext();
  const [isLp, setIsLp] = useState(false);

  useEffect(() => {
    if (!isMainnet || !address) {
      setIsLp(false);
      return;
    }

    const loadLpStatus = async () => {
      try {
        const lpStatus = await fetchIsLiquidityProvider(address, null);
        setIsLp(lpStatus || false);
      } catch (err) {
        console.error('Error loading lp status:', err);
      }
    };

    loadLpStatus();
  }, [isMainnet, address]);

  return (
    !isLp ? null : (
      <>
        <div className={`flex flex-col md:flex-row mb-8 gap-8 md:gap-16 ${className}`}>
          <LabeledValue
            label="Your Status"
            value="Private LP"
            className="min-w-[273.51px]"
          />
          <DescriptionBlock title="What is Private LP Status?" className="flex-1 mb-0">
            Exclusive status for early depositors earning separate rewards. Deposit more to farm daily points.
          </DescriptionBlock>
        </div>
        <Divider className="my-6 md:my-8" />
      </>
    )
  );
}
