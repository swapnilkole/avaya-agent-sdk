import { memo, useEffect, useState } from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';

import { formatCountdown } from '@/utils/format-duration';

interface WrapUpCountdownDisplayProps {
  /** Unix timestamp (seconds) when wrap-up expires. Undefined if no timer is configured. */
  deadline: number | undefined;
  /** Called every second with remaining seconds, for parent UI decisions. */
  onTick?: (remaining: number) => void;
  style?: StyleProp<TextStyle>;
}

/**
 * WrapUpCountdownDisplay — server-driven countdown computed from a deadline.
 *
 * Self-contained so only this node re-renders each second. When the deadline
 * changes (after an extension) the effect re-runs and the countdown adjusts.
 * Display-only: the backend owns auto-completion when the timer expires.
 */
export const WrapUpCountdownDisplay = memo(function WrapUpCountdownDisplay({
  deadline,
  onTick,
  style,
}: WrapUpCountdownDisplayProps) {
  const [remaining, setRemaining] = useState<number>(0);

  useEffect(() => {
    if (deadline === undefined) {
      setRemaining(0);
      onTick?.(0);
      return undefined;
    }

    const computeRemaining = () => Math.max(0, deadline - Math.floor(Date.now() / 1000));

    const initial = computeRemaining();
    setRemaining(initial);
    onTick?.(initial);

    const intervalId = setInterval(() => {
      const next = computeRemaining();
      setRemaining(next);
      onTick?.(next);
      if (next <= 0) {
        clearInterval(intervalId);
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [deadline, onTick]);

  if (deadline === undefined || remaining <= 0) {
    return null;
  }

  return <Text style={style}>{` | ${formatCountdown(remaining)}`}</Text>;
});
