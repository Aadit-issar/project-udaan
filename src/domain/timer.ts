import type { ActiveTimer } from './types';

/** Pure, timestamp-based timer math. The UI never decrements a counter; it re-derives from real time. */
export function elapsedMs(t: ActiveTimer, now: number): number {
  const end = t.pausedAt ?? now;
  return Math.max(0, end - t.startedAt - t.pausedTotalMs);
}

export function remainingMs(t: ActiveTimer, now: number): number {
  return Math.max(0, t.intendedMs - elapsedMs(t, now));
}

export function isFinished(t: ActiveTimer, now: number): boolean {
  return remainingMs(t, now) <= 0;
}

export function pause(t: ActiveTimer, now: number): ActiveTimer {
  return t.pausedAt ? t : { ...t, pausedAt: now };
}

export function resume(t: ActiveTimer, now: number): ActiveTimer {
  if (!t.pausedAt) return t;
  return { ...t, pausedTotalMs: t.pausedTotalMs + (now - t.pausedAt), pausedAt: null };
}

export function formatMs(ms: number): string {
  const s = Math.ceil(ms / 1000);
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
