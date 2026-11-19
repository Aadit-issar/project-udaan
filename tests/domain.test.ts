import { describe, expect, it } from 'vitest';
import { explain, rankTasks } from '../src/domain/priority';
import { addEvent, levelFor, sessionXp, totalXp } from '../src/domain/progress';
import { questSteps, detectKind } from '../src/domain/quest';
import { elapsedMs, pause, remainingMs, resume } from '../src/domain/timer';
import type { ActiveTimer, Task } from '../src/domain/types';
import { sanitize } from '../src/domain/store';

const now = new Date('2026-11-19T10:00:00');
const task = (p: Partial<Task>): Task => ({
  id: p.id ?? Math.random().toString(36), title: 'T', subject: '', importance: 2, dueAt: null, estimateMin: 30, status: 'todo',
  createdAt: '2026-11-01T00:00:00.000Z', updatedAt: '2026-11-01T00:00:00.000Z', completedAt: null, pinned: false, subtasks: [], ...p,
});

describe('priority', () => {
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
  const week = new Date(now); week.setDate(now.getDate() + 7);
  const tasks = [
    task({ id: 'eng', title: 'English presentation', dueAt: week.toISOString(), importance: 2 }),
    task({ id: 'chem', title: 'Chemistry revision', dueAt: tomorrow.toISOString(), importance: 3 }),
    task({ id: 'hist', title: 'History notes' }),
  ];
  it('ranks the nearest important deadline first, deterministically', () => {
    const a = rankTasks(tasks, now).map((r) => r.task.id);
    const b = rankTasks([...tasks].reverse(), now).map((r) => r.task.id);
    expect(a[0]).toBe('chem');
    expect(a).toEqual(b);
  });
  it('explains the recommendation', () => {
    expect(explain(rankTasks(tasks, now)[0])).toMatch(/Recommended because .*tomorrow/i);
  });
  it('manual pin overrides', () => {
    const pinned = tasks.map((t) => (t.id === 'hist' ? { ...t, pinned: true } : t));
    expect(rankTasks(pinned, now)[0].task.id).toBe('hist');
  });
  it('skips completed tasks', () => {
    expect(rankTasks([task({ status: 'done' })], now)).toHaveLength(0);
  });
});

describe('task quest', () => {
  it('detects templates and produces five editable steps', () => {
    expect(detectKind('Prepare English presentation')).toBe('presentation');
    const steps = questSteps('Revise Chemistry Equilibrium');
    expect(steps).toHaveLength(5);
    expect(steps.every((s) => s.length > 3)).toBe(true);
  });
});

describe('timer', () => {
  const t: ActiveTimer = { sessionId: 's', taskId: null, intendedMs: 60_000, startedAt: 0, pausedAt: null, pausedTotalMs: 0, intention: '', demo: false };
  it('uses timestamps, excluding paused time', () => {
    const p = pause(t, 10_000);
    expect(elapsedMs(p, 50_000)).toBe(10_000);
    const r = resume(p, 50_000);
    expect(elapsedMs(r, 60_000)).toBe(20_000);
    expect(remainingMs(r, 60_000)).toBe(40_000);
  });
  it('never goes negative', () => {
    expect(remainingMs(t, 999_999)).toBe(0);
  });
});

describe('progress', () => {
  it('is idempotent by event id', () => {
    const e = { id: 'task:1', type: 'task-complete' as const, refId: '1', label: 'x', at: now.toISOString(), xp: 40 };
    const once = addEvent([], e);
    expect(addEvent(once, e)).toHaveLength(1);
    expect(totalXp(addEvent(once, e))).toBe(40);
  });
  it('levels by XP thresholds', () => {
    expect(levelFor(0).stage.level).toBe(0);
    expect(levelFor(40).stage.level).toBe(1);
    expect(levelFor(5000).next).toBeNull();
    expect(sessionXp(0)).toBe(0);
    expect(sessionXp(25)).toBe(50);
  });
});

describe('import validation', () => {
  it('rejects foreign data', () => {
    expect(() => sanitize({ hello: 1 })).toThrow();
    expect(() => sanitize(null)).toThrow();
  });
});
