import { useEffect, useState } from 'react';
import { levelFor, totalXp } from './domain/progress';
import { formatMs, remainingMs } from './domain/timer';
import type { UdaanState } from './domain/types';

/** Re-renders on an interval; time itself always comes from Date.now(). */
export function useNow(ms = 1000, active = true): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), ms);
    const vis = () => setNow(Date.now());
    document.addEventListener('visibilitychange', vis);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', vis); };
  }, [ms, active]);
  return now;
}

export const sameDay = (iso: string | null, d = new Date()) => {
  if (!iso) return false;
  const x = new Date(iso);
  return x.getFullYear() === d.getFullYear() && x.getMonth() === d.getMonth() && x.getDate() === d.getDate();
};

/** Today's numbers, all derived from stored records (never invented). */
export function todayStats(s: UdaanState) {
  const focusMin = Math.round(s.sessions.filter((x) => sameDay(x.endedAt)).reduce((a, x) => a + x.focusedMin, 0));
  const tasksDone = s.tasks.filter((t) => t.status === 'done' && sameDay(t.completedAt)).length;
  const xp = totalXp(s.events);
  return { focusMin, tasksDone, xp, level: levelFor(xp), goalPct: Math.min(1, focusMin / Math.max(1, s.settings.dailyGoalMin)) };
}

export function timerView(s: UdaanState, now: number) {
  const t = s.timer;
  if (!t) return { state: 'idle' as const, remaining: formatMs(s.settings.focusMin * 60_000), pct: 0, done: false };
  const rem = remainingMs(t, now);
  return {
    state: t.pausedAt ? ('paused' as const) : ('running' as const),
    remaining: formatMs(rem),
    pct: 1 - rem / t.intendedMs,
    done: rem <= 0,
  };
}

export function greeting(d = new Date()) {
  const h = d.getHours();
  return h < 5 ? 'Still up' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}
