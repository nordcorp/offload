import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SESSION_POLL_INTERVAL_MS, startSessionMonitor } from './session-monitor';

class FakeVisibility {
  visibilityState: DocumentVisibilityState = 'visible';
  private listener: (() => void) | null = null;

  addEventListener(_type: 'visibilitychange', listener: () => void) {
    this.listener = listener;
  }

  removeEventListener(_type: 'visibilitychange', listener: () => void) {
    if (this.listener === listener) this.listener = null;
  }

  changeTo(state: DocumentVisibilityState) {
    this.visibilityState = state;
    this.listener?.();
  }
}

describe('session monitor', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('checks the session every 30 seconds', async () => {
    const check = vi.fn().mockResolvedValue(undefined);
    const stop = startSessionMonitor(check, new FakeVisibility());

    await vi.advanceTimersByTimeAsync(SESSION_POLL_INTERVAL_MS);
    expect(check).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(SESSION_POLL_INTERVAL_MS);
    expect(check).toHaveBeenCalledTimes(2);
    stop();
  });

  it('skips hidden tabs and checks immediately when they become visible', async () => {
    const visibility = new FakeVisibility();
    visibility.changeTo('hidden');
    const check = vi.fn().mockResolvedValue(undefined);
    const stop = startSessionMonitor(check, visibility);

    await vi.advanceTimersByTimeAsync(SESSION_POLL_INTERVAL_MS * 2);
    expect(check).not.toHaveBeenCalled();

    visibility.changeTo('visible');
    await vi.runAllTicks();
    expect(check).toHaveBeenCalledTimes(1);
    stop();
  });

  it('does not start a parallel check and stops cleanly', async () => {
    let finishCheck: (() => void) | undefined;
    const check = vi.fn(() => new Promise<void>(resolve => {
      finishCheck = resolve;
    }));
    const visibility = new FakeVisibility();
    const stop = startSessionMonitor(check, visibility);

    await vi.advanceTimersByTimeAsync(SESSION_POLL_INTERVAL_MS);
    await vi.advanceTimersByTimeAsync(SESSION_POLL_INTERVAL_MS);
    visibility.changeTo('visible');
    expect(check).toHaveBeenCalledTimes(1);

    finishCheck?.();
    await vi.runAllTicks();
    stop();
    await vi.advanceTimersByTimeAsync(SESSION_POLL_INTERVAL_MS);
    expect(check).toHaveBeenCalledTimes(1);
  });
});
