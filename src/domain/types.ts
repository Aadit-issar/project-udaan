export type Importance = 1 | 2 | 3;
export type Energy = 'low' | 'steady' | 'high';

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export interface Task {
  id: string;
  title: string;
  subject: string;
  importance: Importance;
  /** ISO timestamp (UTC) or null when the task has no deadline. */
  dueAt: string | null;
  estimateMin: number;
  status: 'todo' | 'done';
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  /** Manual priority override — pinned tasks always rank first. */
  pinned: boolean;
  subtasks: Subtask[];
}

export interface FocusSession {
  id: string;
  taskId: string | null;
  taskTitle: string;
  intendedMin: number;
  startedAt: string;
  endedAt: string;
  pausedMs: number;
  /** Minutes the student confirmed as focused work (never inferred from idle time). */
  focusedMin: number;
  status: 'completed' | 'ended-early';
  intention: string;
  demo: boolean;
}

export type ProgressEventType = 'task-complete' | 'step-complete' | 'session-complete';

export interface ProgressEvent {
  /** Deterministic key, e.g. `task:<id>` — makes rewards idempotent. */
  id: string;
  type: ProgressEventType;
  refId: string;
  label: string;
  at: string;
  xp: number;
}

/** Live timer persisted with real timestamps, so reloads, tab switches and sleep do not corrupt it. */
export interface ActiveTimer {
  sessionId: string;
  taskId: string | null;
  intendedMs: number;
  startedAt: number;
  pausedAt: number | null;
  pausedTotalMs: number;
  intention: string;
  demo: boolean;
}

export interface Settings {
  name: string;
  focusMin: number;
  dailyGoalMin: number;
  reducedMotion: boolean;
  lowPerf: boolean;
  sound: boolean;
}

export interface UdaanState {
  version: 1;
  onboarded: boolean;
  tasks: Task[];
  sessions: FocusSession[];
  events: ProgressEvent[];
  settings: Settings;
  timer: ActiveTimer | null;
}

export const DEFAULT_SETTINGS: Settings = {
  name: '',
  focusMin: 25,
  dailyGoalMin: 60,
  reducedMotion: false,
  lowPerf: false,
  sound: true,
};

export function emptyState(): UdaanState {
  return { version: 1, onboarded: false, tasks: [], sessions: [], events: [], settings: { ...DEFAULT_SETTINGS }, timer: null };
}
