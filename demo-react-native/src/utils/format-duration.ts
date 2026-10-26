/** Formats duration in seconds to HH:MM:SS. */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours.toString().padStart(2, '0')}:${mins
    .toString()
    .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Formats countdown seconds for the wrap-up timer.
 *
 * @example formatCountdown(12) // "12s"
 * @example formatCountdown(65) // "1m 5s"
 */
export function formatCountdown(seconds: number): string {
  if (seconds <= 0) return '0s';
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

/**
 * Human-readable duration since a UTC timestamp, used for queue login times.
 * @returns e.g. "1 hour", "15 seconds", "2 days", or null when unavailable.
 */
export function getLoggedInDuration(loginTime: Date | undefined): string | null {
  if (!loginTime) return null;

  const diffMs = Date.now() - loginTime.getTime();
  if (Number.isNaN(diffMs) || diffMs < 0) return null;

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return days === 1 ? '1 day' : `${days} days`;
  if (hours > 0) return hours === 1 ? '1 hour' : `${hours} hours`;
  if (minutes > 0) return minutes === 1 ? '1 minute' : `${minutes} minutes`;
  return seconds === 1 ? '1 second' : `${seconds} seconds`;
}

/** Short clock time for message timestamps. */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
