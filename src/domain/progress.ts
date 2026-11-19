import type { ProgressEvent } from './types';

/** XP rules — rewards work accomplished, never time spent looking at the app. */
export const XP = { task: 40, step: 8, perFocusMinute: 2, minSession: 4 } as const;

export interface WorldStage {
  level: number;
  xp: number;
  name: string;
  unlock: string;
}

/** Each level unlocks a visible element of the Skyworld. */
export const STAGES: WorldStage[] = [
  { level: 0, xp: 0, name: 'Bare Isle', unlock: 'A quiet floating island' },
  { level: 1, xp: 40, name: 'First Light', unlock: 'Grass and your first sapling' },
  { level: 2, xp: 110, name: 'Study Grove', unlock: 'A grove of trees' },
  { level: 3, xp: 220, name: 'Lantern Path', unlock: 'Lanterns that glow at dusk' },
  { level: 4, xp: 360, name: 'Skybridge', unlock: 'A second island and a bridge' },
  { level: 5, xp: 540, name: 'Windmill Rise', unlock: 'A windmill catching the breeze' },
  { level: 6, xp: 780, name: 'Lighthouse', unlock: 'A lighthouse for the horizon' },
  { level: 7, xp: 1100, name: 'Open Horizon', unlock: 'Paper gliders in flight' },
];

export function totalXp(events: ProgressEvent[]): number {
  return events.reduce((s, e) => s + e.xp, 0);
}

export function levelFor(xp: number): { stage: WorldStage; next: WorldStage | null; pct: number } {
  let i = 0;
  while (i + 1 < STAGES.length && xp >= STAGES[i + 1].xp) i++;
  const stage = STAGES[i];
  const next = STAGES[i + 1] ?? null;
  const pct = next ? (xp - stage.xp) / (next.xp - stage.xp) : 1;
  return { stage, next, pct };
}

/** Idempotent append: an event id can only ever be recorded once. */
export function addEvent(events: ProgressEvent[], e: ProgressEvent): ProgressEvent[] {
  return events.some((x) => x.id === e.id) ? events : [...events, e];
}

export function sessionXp(focusedMin: number): number {
  return focusedMin <= 0 ? 0 : Math.max(XP.minSession, Math.round(focusedMin * XP.perFocusMinute));
}
