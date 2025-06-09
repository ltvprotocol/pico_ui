import { useEffect, useRef, useState } from "react";

type UseAdaptiveIntervalOptions = {
  initialDelay?: number;
  maxDelay?: number;
  multiplier?: number;
  enabled?: boolean;
};

export function useAdaptiveInterval(
  fn: () => Promise<void>,
  options: UseAdaptiveIntervalOptions = {}
) {
  const {
    initialDelay = 6000,
    maxDelay = 60000,
    multiplier = 2,
    enabled = true,
  } = options;

  const [delay, setDelay] = useState(initialDelay);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    const execute = async () => {
      try {
        await fn();
        if (!cancelled) {
          setDelay(initialDelay);
        }
      } catch (e) {
        if (!cancelled) {
          setDelay(prev => Math.min(prev * multiplier, maxDelay));
        }
      }

      if (!cancelled) {
        timeoutRef.current = setTimeout(execute, delay);
      }
    };

    execute();

    return () => {
      cancelled = true;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [enabled]);
}