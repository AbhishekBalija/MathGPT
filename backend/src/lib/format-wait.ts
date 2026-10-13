/** Human-friendly wait copy for rate limits and lockouts. */
export function formatWait(seconds: number): string {
  const waitSeconds = Math.max(1, Math.ceil(seconds));

  if (waitSeconds < 60) {
    return waitSeconds === 1
      ? "Please wait 1 second"
      : `Please wait ${waitSeconds} seconds`;
  }

  const minutes = Math.round(waitSeconds / 60);
  const minuteLabel = minutes === 1 ? "minute" : "minutes";
  return `Please wait about ${minutes} ${minuteLabel} and try again`;
}

export function tooManyAttemptsMessage(retryAfterSeconds: number): string {
  return `Too many attempts. ${formatWait(retryAfterSeconds)}`;
}
