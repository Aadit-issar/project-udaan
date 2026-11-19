import type { Energy, Task } from './types';

export interface Ranked {
  task: Task;
  score: number;
  reasons: string[];
}

const HOUR = 3_600_000;

/** Calendar-day difference in the student's local timezone (0 = today, 1 = tomorrow, -1 = yesterday). */
export function dayDiff(iso: string, now: Date): number {
  const d = new Date(iso);
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const b = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.round((b - a) / 86_400_000);
}

export function dueLabel(iso: string | null, now = new Date()): string {
  if (!iso) return 'No deadline';
  const diff = dayDiff(iso, now);
  if (new Date(iso).getTime() < now.getTime()) return diff === 0 ? 'Due earlier today' : 'Overdue';
  if (diff === 0) return 'Due today';
  if (diff === 1) return 'Due tomorrow';
  if (diff < 7) return `Due ${new Date(iso).toLocaleDateString(undefined, { weekday: 'long' })}`;
  return `Due ${new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}

export function progressOf(task: Task): number {
  if (task.status === 'done') return 1;
  if (!task.subtasks.length) return 0;
  return task.subtasks.filter((s) => s.done).length / task.subtasks.length;
}

/**
 * Transparent, deterministic priority score. Every point added has a matching
 * human-readable reason, so the recommendation can always explain itself.
 */
export function scoreTask(task: Task, now: Date, availableMin: number, energy: Energy): Ranked {
  let score = 0;
  const reasons: string[] = [];

  if (task.pinned) {
    score += 1000;
    reasons.push('you pinned it as your priority');
  }

  if (task.dueAt) {
    const hours = (new Date(task.dueAt).getTime() - now.getTime()) / HOUR;
    const days = dayDiff(task.dueAt, now);
    if (hours < 0) { score += 90; reasons.push('it is overdue — a small step now still counts'); }
    else if (days <= 0) { score += 85; reasons.push('it is due today'); }
    else if (days === 1) { score += 70; reasons.push('it is due tomorrow'); }
    else if (days <= 3) { score += 50; reasons.push(`it is due in ${days} days`); }
    else if (days <= 7) { score += 30; reasons.push('it is due this week'); }
    else score += 12;
  } else {
    score += 8;
  }

  score += task.importance * 12;
  if (task.importance === 3) reasons.push('you marked it as important');

  const remaining = Math.max(5, Math.round(task.estimateMin * (1 - progressOf(task))));
  if (remaining <= availableMin) {
    score += 10;
    reasons.push(`it takes about ${remaining} minutes`);
  } else {
    score -= 4;
  }

  if (energy === 'low' && remaining <= 25) { score += 14; reasons.push('it suits a low-energy moment'); }
  if (energy === 'high' && task.importance === 3) score += 8;

  const p = progressOf(task);
  if (p > 0 && p < 1) { score += 6; reasons.push(`you're already ${Math.round(p * 100)}% through`); }

  return { task, score, reasons };
}

/** Stable ranking: score, then earliest deadline (no deadline last), then oldest, then id. */
export function rankTasks(tasks: Task[], now = new Date(), availableMin = 25, energy: Energy = 'steady'): Ranked[] {
  return tasks
    .filter((t) => t.status === 'todo')
    .map((t) => scoreTask(t, now, availableMin, energy))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const da = a.task.dueAt ? Date.parse(a.task.dueAt) : Infinity;
      const db = b.task.dueAt ? Date.parse(b.task.dueAt) : Infinity;
      if (da !== db) return da - db;
      if (a.task.createdAt !== b.task.createdAt) return a.task.createdAt < b.task.createdAt ? -1 : 1;
      return a.task.id < b.task.id ? -1 : 1;
    });
}

export function explain(r: Ranked): string {
  const parts = r.reasons.slice(0, 3);
  if (!parts.length) return 'Recommended because it is your best next option right now.';
  const joined = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
  return `Recommended because ${joined}.`;
}
