import { memo, useEffect, useState } from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';

import { formatDuration } from '@/utils/format-duration';

interface TimerDisplayProps {
  /** Start time to count from. Converted to a stable numeric value internally. */
  startTime: Date | null | undefined;
  style?: StyleProp<TextStyle>;
}

/**
 * TimerDisplay — self-contained ticking timer that only re-renders itself.
 *
 * Ported from demo-app with its design intact:
 * - It is a COMPONENT, not a hook, so 1-second updates re-render this tiny Text
 *   node rather than the whole CallControlsBar / InteractionCard.
 * - The effect depends on `startTime.getTime()` (a stable number) rather than the
 *   Date object reference, which may be a getter returning a new Date each access.
 * - It syncs to the next whole-second boundary so multiple timers tick together
 *   and React can batch their updates.
 */
export const TimerDisplay = memo(function TimerDisplay({ startTime, style }: TimerDisplayProps) {
  const startMs = startTime?.getTime() ?? 0;

  const [duration, setDuration] = useState(() => {
    if (!startMs) return 0;
    const seconds = Math.floor((Date.now() - startMs) / 1000);
    return seconds < 0 ? 0 : seconds;
  });

  useEffect(() => {
    if (!startMs) return undefined;

    // Defined inside the effect so the closure always captures the current startMs.
    const calc = () => {
      const seconds = Math.floor((Date.now() - startMs) / 1000);
      return seconds < 0 ? 0 : seconds;
    };

    setDuration(calc());

    const delay = 1000 - new Date().getMilliseconds();
    let interval: ReturnType<typeof setInterval>;

    const timeout = setTimeout(() => {
      setDuration(calc());
      interval = setInterval(() => setDuration(calc()), 1000);
    }, delay);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [startMs]);

  return <Text style={style}>{formatDuration(duration)}</Text>;
});
