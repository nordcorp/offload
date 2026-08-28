export const SESSION_POLL_INTERVAL_MS = 30_000;

interface VisibilitySource {
  visibilityState: DocumentVisibilityState;
  addEventListener(type: 'visibilitychange', listener: () => void): void;
  removeEventListener(type: 'visibilitychange', listener: () => void): void;
}

export function startSessionMonitor(
  checkSession: () => Promise<void>,
  visibility: VisibilitySource = document,
  intervalMs = SESSION_POLL_INTERVAL_MS,
): () => void {
  let stopped = false;
  let checkInFlight = false;

  const runCheck = async () => {
    if (stopped || checkInFlight || visibility.visibilityState !== 'visible') {
      return;
    }

    checkInFlight = true;
    try {
      await checkSession();
    } finally {
      checkInFlight = false;
    }
  };

  const handleVisibilityChange = () => {
    if (visibility.visibilityState === 'visible') {
      void runCheck();
    }
  };

  const interval = setInterval(() => {
    void runCheck();
  }, intervalMs);
  visibility.addEventListener('visibilitychange', handleVisibilityChange);

  return () => {
    stopped = true;
    clearInterval(interval);
    visibility.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}
