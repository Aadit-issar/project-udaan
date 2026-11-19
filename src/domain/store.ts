import { useSyncExternalStore } from 'react';
import { addEvent, sessionXp, XP } from './progress';
import { pause as pauseT, resume as resumeT, elapsedMs } from './timer';
import { questSteps } from './quest';
import { emptyState, DEFAULT_SETTINGS, type ActiveTimer, type Importance, type Settings, type Task, type UdaanState } from './types';

/**
 * Local-first persistence. Real data and demo data live under different keys,
 * so demo tasks can never contaminate a student's real records.
 */
const KEY_REAL = 'udaan:v1';
const KEY_DEMO = 'udaan:demo:v1';
const KEY_MODE = 'udaan:mode';

export type Mode = 'real' | 'demo';

export const uid = () =>
  (globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown, max = 300) => (typeof v === 'string' ? v.slice(0, max) : '');

/** Validates and normalises untrusted data (storage or imported file). Throws on unusable input. */
export function sanitize(raw: unknown): UdaanState {
  if (!isObj(raw) || raw.version !== 1 || !Array.isArray(raw.tasks)) throw new Error('This is not a UDAAN backup file.');
  const base = emptyState();
  const tasks: Task[] = (raw.tasks as unknown[]).filter(isObj).slice(0, 2000).map((t) => ({
    id: str(t.id, 80) || uid(),
    title: str(t.title, 200) || 'Untitled task',
    subject: str(t.subject, 60),
    importance: ([1, 2, 3].includes(t.importance as number) ? t.importance : 2) as Importance,
    dueAt: typeof t.dueAt === 'string' && !Number.isNaN(Date.parse(t.dueAt)) ? t.dueAt : null,
    estimateMin: Math.min(600, Math.max(5, Number(t.estimateMin) || 25)),
    status: t.status === 'done' ? 'done' : 'todo',
    createdAt: str(t.createdAt, 40) || new Date().toISOString(),
    updatedAt: str(t.updatedAt, 40) || new Date().toISOString(),
    completedAt: typeof t.completedAt === 'string' ? t.completedAt : null,
    pinned: t.pinned === true,
    subtasks: Array.isArray(t.subtasks)
      ? (t.subtasks as unknown[]).filter(isObj).slice(0, 50).map((s) => ({ id: str(s.id, 80) || uid(), title: str(s.title, 200) || 'Step', done: s.done === true }))
      : [],
  }));
  const sessions = Array.isArray(raw.sessions) ? (raw.sessions as unknown[]).filter(isObj).slice(0, 5000).map((s) => ({
    id: str(s.id, 80) || uid(),
    taskId: typeof s.taskId === 'string' ? s.taskId : null,
    taskTitle: str(s.taskTitle, 200),
    intendedMin: Number(s.intendedMin) || 0,
    startedAt: str(s.startedAt, 40),
    endedAt: str(s.endedAt, 40),
    pausedMs: Number(s.pausedMs) || 0,
    focusedMin: Math.max(0, Number(s.focusedMin) || 0),
    status: s.status === 'ended-early' ? 'ended-early' as const : 'completed' as const,
    intention: str(s.intention, 200),
    demo: s.demo === true,
  })) : [];
  const events = Array.isArray(raw.events) ? (raw.events as unknown[]).filter(isObj).slice(0, 20000).map((e) => ({
    id: str(e.id, 120),
    type: (['task-complete', 'step-complete', 'session-complete'].includes(e.type as string) ? e.type : 'task-complete') as UdaanState['events'][number]['type'],
    refId: str(e.refId, 80),
    label: str(e.label, 200),
    at: str(e.at, 40),
    xp: Math.max(0, Math.min(1000, Number(e.xp) || 0)),
  })).filter((e) => e.id) : [];
  const s = isObj(raw.settings) ? raw.settings : {};
  const settings: Settings = {
    name: str(s.name, 40),
    focusMin: Math.min(120, Math.max(1, Number(s.focusMin) || DEFAULT_SETTINGS.focusMin)),
    dailyGoalMin: Math.min(600, Math.max(10, Number(s.dailyGoalMin) || DEFAULT_SETTINGS.dailyGoalMin)),
    reducedMotion: s.reducedMotion === true,
    lowPerf: s.lowPerf === true,
    sound: s.sound !== false,
  };
  const t = raw.timer;
  const timer: ActiveTimer | null = isObj(t) && typeof t.startedAt === 'number' && typeof t.intendedMs === 'number'
    ? { sessionId: str(t.sessionId, 80) || uid(), taskId: typeof t.taskId === 'string' ? t.taskId : null, intendedMs: t.intendedMs, startedAt: t.startedAt,
        pausedAt: typeof t.pausedAt === 'number' ? t.pausedAt : null, pausedTotalMs: Number(t.pausedTotalMs) || 0, intention: str(t.intention, 200), demo: t.demo === true }
    : null;
  // Deduplicate events by id (idempotency survives even hand-edited files).
  const seen = new Set<string>();
  return { ...base, onboarded: raw.onboarded === true, tasks, sessions, events: events.filter((e) => !seen.has(e.id) && seen.add(e.id)), settings, timer };
}

function safeGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

let mode: Mode = safeGet(KEY_MODE) === 'demo' ? 'demo' : 'real';
let state: UdaanState = load(mode);
let storageError: string | null = null;
const listeners = new Set<() => void>();

function keyFor(m: Mode) { return m === 'demo' ? KEY_DEMO : KEY_REAL; }

function load(m: Mode): UdaanState {
  const raw = safeGet(keyFor(m));
  if (!raw) return emptyState();
  try { return sanitize(JSON.parse(raw)); } catch { return emptyState(); }
}

function emit() { listeners.forEach((l) => l()); }

function commit(next: UdaanState) {
  state = next;
  try {
    localStorage.setItem(keyFor(mode), JSON.stringify(next));
    storageError = null;
  } catch {
    storageError = 'Could not save to this device. Your changes are kept for this visit only.';
  }
  emit();
}

function update(fn: (s: UdaanState) => UdaanState) { commit(fn(state)); }

// Multi-tab safety: another tab's save is picked up here.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === keyFor(mode)) { state = load(mode); emit(); }
    if (e.key === KEY_MODE) { mode = safeGet(KEY_MODE) === 'demo' ? 'demo' : 'real'; state = load(mode); emit(); }
  });
}

export const store = {
  get: () => state,
  mode: () => mode,
  error: () => storageError,
  subscribe(l: () => void) { listeners.add(l); return () => listeners.delete(l); },
};

export function useUdaan(): UdaanState {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}
export function useMode(): Mode {
  useUdaan();
  return mode;
}

const nowIso = () => new Date().toISOString();

// ───────────────────────── Actions ─────────────────────────

export interface TaskInput {
  title: string;
  subject: string;
  importance: Importance;
  dueAt: string | null;
  estimateMin: number;
}

export function createTask(input: TaskInput, withQuest = false): Task {
  const t: Task = {
    id: uid(), title: input.title.trim().slice(0, 200), subject: input.subject.trim().slice(0, 60), importance: input.importance,
    dueAt: input.dueAt, estimateMin: Math.min(600, Math.max(5, Math.round(input.estimateMin) || 25)), status: 'todo',
    createdAt: nowIso(), updatedAt: nowIso(), completedAt: null, pinned: false,
    subtasks: withQuest ? questSteps(input.title).map((title) => ({ id: uid(), title, done: false })) : [],
  };
  update((s) => ({ ...s, tasks: [...s.tasks, t] }));
  return t;
}

export function editTask(id: string, patch: Partial<TaskInput & { pinned: boolean }>) {
  update((s) => ({ ...s, tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: nowIso() } : t)) }));
}

export function deleteTask(id: string): Task | undefined {
  const t = state.tasks.find((x) => x.id === id);
  // Sessions and progress events are kept: deleting a task never rewrites history.
  update((s) => ({ ...s, tasks: s.tasks.filter((x) => x.id !== id) }));
  return t;
}

export function restoreTask(t: Task) {
  update((s) => (s.tasks.some((x) => x.id === t.id) ? s : { ...s, tasks: [...s.tasks, t] }));
}

/** XP is granted once per task. Reopening and re-completing never awards it again. */
export function setTaskDone(id: string, done: boolean) {
  update((s) => {
    const task = s.tasks.find((t) => t.id === id);
    if (!task) return s;
    const tasks = s.tasks.map((t) => (t.id === id ? { ...t, status: done ? 'done' as const : 'todo' as const, completedAt: done ? nowIso() : null, updatedAt: nowIso(), pinned: done ? false : t.pinned } : t));
    const events = done ? addEvent(s.events, { id: `task:${id}`, type: 'task-complete', refId: id, label: task.title, at: nowIso(), xp: XP.task }) : s.events;
    return { ...s, tasks, events };
  });
}

export function pinTask(id: string) {
  update((s) => ({ ...s, tasks: s.tasks.map((t) => ({ ...t, pinned: t.id === id ? !t.pinned : false })) }));
}

export function setQuest(id: string, titles: string[]) {
  update((s) => ({ ...s, tasks: s.tasks.map((t) => (t.id === id ? { ...t, subtasks: titles.map((title) => ({ id: uid(), title, done: false })), updatedAt: nowIso() } : t)) }));
}

export function toggleStep(taskId: string, stepId: string) {
  update((s) => {
    let events = s.events;
    const tasks = s.tasks.map((t) => {
      if (t.id !== taskId) return t;
      const subtasks = t.subtasks.map((st) => {
        if (st.id !== stepId) return st;
        if (!st.done) events = addEvent(events, { id: `step:${st.id}`, type: 'step-complete', refId: st.id, label: st.title, at: nowIso(), xp: XP.step });
        return { ...st, done: !st.done };
      });
      return { ...t, subtasks, updatedAt: nowIso() };
    });
    return { ...s, tasks, events };
  });
}

export function addStep(taskId: string, title: string) {
  if (!title.trim()) return;
  update((s) => ({ ...s, tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, subtasks: [...t.subtasks, { id: uid(), title: title.trim().slice(0, 200), done: false }] } : t)) }));
}

export function editStep(taskId: string, stepId: string, title: string) {
  update((s) => ({ ...s, tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, subtasks: t.subtasks.map((st) => (st.id === stepId ? { ...st, title: title.slice(0, 200) } : st)) } : t)) }));
}

export function removeStep(taskId: string, stepId: string) {
  update((s) => ({ ...s, tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, subtasks: t.subtasks.filter((st) => st.id !== stepId) } : t)) }));
}

export function moveStep(taskId: string, stepId: string, dir: -1 | 1) {
  update((s) => ({ ...s, tasks: s.tasks.map((t) => {
    if (t.id !== taskId) return t;
    const i = t.subtasks.findIndex((st) => st.id === stepId);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= t.subtasks.length) return t;
    const subtasks = [...t.subtasks];
    [subtasks[i], subtasks[j]] = [subtasks[j], subtasks[i]];
    return { ...t, subtasks };
  }) }));
}

// ─── Focus timer ───

export function startTimer(taskId: string | null, minutes: number, intention = '') {
  const demo = mode === 'demo';
  update((s) => ({ ...s, timer: { sessionId: uid(), taskId, intendedMs: Math.round(minutes * 60_000), startedAt: Date.now(), pausedAt: null, pausedTotalMs: 0, intention: intention.slice(0, 200), demo } }));
}
export function pauseTimer() { update((s) => (s.timer ? { ...s, timer: pauseT(s.timer, Date.now()) } : s)); }
export function resumeTimer() { update((s) => (s.timer ? { ...s, timer: resumeT(s.timer, Date.now()) } : s)); }
export function resetTimer() { update((s) => ({ ...s, timer: null })); }

/**
 * Ends the active session. `confirmedFocus` is the student's own confirmation —
 * idle time is never silently counted. Idempotent: the session id keys both
 * the session record and its XP event, so double clicks cannot double-reward.
 */
export function finishTimer(confirmedFocus: boolean, opts: { simulateFull?: boolean } = {}) {
  update((s) => {
    const t = s.timer;
    if (!t || s.sessions.some((x) => x.id === t.sessionId)) return { ...s, timer: null };
    const now = Date.now();
    const elapsed = opts.simulateFull && mode === 'demo' ? t.intendedMs : Math.min(elapsedMs(t, now), t.intendedMs);
    const minutes = Math.round((elapsed / 60_000) * 10) / 10;
    const completed = elapsed >= t.intendedMs - 1000;
    const focusedMin = confirmedFocus ? minutes : 0;
    const task = s.tasks.find((x) => x.id === t.taskId);
    const session = {
      id: t.sessionId, taskId: t.taskId, taskTitle: task?.title ?? 'Open focus', intendedMin: t.intendedMs / 60_000,
      startedAt: new Date(t.startedAt).toISOString(), endedAt: new Date(now).toISOString(), pausedMs: t.pausedTotalMs,
      focusedMin, status: completed ? 'completed' as const : 'ended-early' as const, intention: t.intention, demo: t.demo,
    };
    const xp = sessionXp(focusedMin);
    const events = xp > 0 ? addEvent(s.events, { id: `session:${t.sessionId}`, type: 'session-complete', refId: t.sessionId, label: `${focusedMin} min focus · ${session.taskTitle}`, at: session.endedAt, xp }) : s.events;
    return { ...s, timer: null, sessions: [...s.sessions, session], events };
  });
}

// ─── Settings, onboarding, modes, data ───

export function updateSettings(patch: Partial<Settings>) { update((s) => ({ ...s, settings: { ...s.settings, ...patch } })); }
export function setOnboarded(v: boolean) { update((s) => ({ ...s, onboarded: v })); }

export function switchMode(next: Mode) {
  mode = next;
  try { localStorage.setItem(KEY_MODE, next); } catch { /* ignore */ }
  state = next === 'demo' ? demoState() : load('real');
  if (next === 'demo') commit(state); else emit();
}

export function exportJson(): string {
  return JSON.stringify({ app: 'project-udaan', exportedAt: nowIso(), ...state }, null, 2);
}

export function importJson(text: string): UdaanState {
  if (text.length > 5_000_000) throw new Error('That file is too large to be a UDAAN backup.');
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { throw new Error('That file is not valid JSON.'); }
  return sanitize(parsed);
}
export function replaceState(next: UdaanState) { commit(next); }

export function clearAll() {
  commit({ ...emptyState() });
}

// ─── Demo data (clearly separate, regenerated relative to "now") ───

export function demoState(): UdaanState {
  const now = new Date();
  const at = (days: number, hour: number) => { const d = new Date(now); d.setDate(d.getDate() + days); d.setHours(hour, 0, 0, 0); return d.toISOString(); };
  const mk = (title: string, subject: string, importance: Importance, dueAt: string | null, estimateMin: number, quest = false): Task => ({
    id: uid(), title, subject, importance, dueAt, estimateMin, status: 'todo', createdAt: nowIso(), updatedAt: nowIso(), completedAt: null, pinned: false,
    subtasks: quest ? questSteps(title).map((t) => ({ id: uid(), title: t, done: false })) : [],
  });
  // A believable week of history so the Skyworld is already growing (500 XP = Skybridge);
  // finishing the Chemistry task (+40) unlocks Windmill Rise live during a demo.
  const done = (title: string, subject: string, daysAgo: number): Task => {
    const t = mk(title, subject, 2, at(-daysAgo, 20), 30);
    return { ...t, status: 'done', completedAt: at(-daysAgo, 19), createdAt: at(-daysAgo - 2, 9) };
  };
  const doneTasks = [done('Hindi essay draft', 'Hindi', 4), done('Physics numericals: motion', 'Physics', 3), done('Biology diagram practice', 'Biology', 2), done('Geography map work', 'Geography', 1)];
  const sessions = [[5, 25], [4, 25], [3, 40], [2, 30], [1, 25], [1, 25]].map(([daysAgo, min], i) => {
    const t = doneTasks[i % doneTasks.length];
    return { id: uid(), taskId: t.id, taskTitle: t.title, intendedMin: min, startedAt: at(-daysAgo, 17), endedAt: at(-daysAgo, 18), pausedMs: 0, focusedMin: min, status: 'completed' as const, intention: '', demo: true };
  });
  const events: UdaanState['events'] = [
    ...sessions.map((x) => ({ id: `session:${x.id}`, type: 'session-complete' as const, refId: x.id, label: `${x.focusedMin} min focus · ${x.taskTitle}`, at: x.endedAt, xp: sessionXp(x.focusedMin) })),
    ...doneTasks.map((t) => ({ id: `task:${t.id}`, type: 'task-complete' as const, refId: t.id, label: `Completed · ${t.title}`, at: t.completedAt!, xp: XP.task })),
  ].sort((a, b) => a.at.localeCompare(b.at));
  return {
    ...emptyState(),
    onboarded: true,
    settings: { ...DEFAULT_SETTINGS, name: 'Demo Student' },
    sessions,
    events,
    tasks: [
      ...doneTasks,
      mk('Revise Chemistry Equilibrium', 'Chemistry', 3, at(1, 9), 40),
      mk('Mathematics practice: quadratic equations', 'Maths', 2, at(2, 17), 35),
      mk('Prepare English presentation', 'English', 2, at(7, 10), 90, true),
      mk('Read History chapter 4', 'History', 1, null, 30),
    ],
  };
}
