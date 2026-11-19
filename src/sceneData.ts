import { dueLabel, rankTasks } from './domain/priority';
import { questSteps } from './domain/quest';
import { setTaskDone, startTimer, pauseTimer, resumeTimer } from './domain/store';
import type { UdaanState } from './domain/types';
import { timerView, todayStats } from './hooks';
import type { SceneAction, SceneData } from './xr/scene';

/** Builds the 3D/VR panel data from the same persisted state the 2D screens use. */
export function sceneDataFor(s: UdaanState, now: number): SceneData {
  const tv = timerView(s, now);
  const active = s.timer ? s.tasks.find((t) => t.id === s.timer!.taskId) : null;
  const top = rankTasks(s.tasks, new Date(now))[0]?.task ?? null;
  const focusTask = active ?? top;
  const { xp, level } = todayStats(s);
  const open = rankTasks(s.tasks, new Date(now)).map((r) => r.task);
  const doneToday = s.tasks.filter((t) => t.status === 'done').slice(-1);
  return {
    taskTitle: focusTask?.title ?? 'Open focus session',
    step: s.timer?.intention || (focusTask ? focusTask.subtasks.find((x) => !x.done)?.title ?? questSteps(focusTask.title)[0] : ''),
    remaining: tv.remaining,
    pct: Math.max(0, Math.min(1, tv.pct)),
    state: tv.state,
    focusMin: s.settings.focusMin,
    tasks: [...open.slice(0, 3), ...doneToday].slice(0, 4).map((t) => ({ id: t.id, title: t.title, done: t.status === 'done', due: dueLabel(t.dueAt) })),
    level: level.stage.level,
    levelName: level.stage.name,
    xp,
    levelPct: level.pct,
    nextName: level.next?.name ?? null,
  };
}

/** Shared handler for actions coming from 3D panels / VR controllers. */
export function handleSceneAction(s: UdaanState, a: SceneAction, finish: () => void) {
  if (a.type === 'start') {
    const top = rankTasks(s.tasks)[0]?.task ?? null;
    const step = top ? top.subtasks.find((x) => !x.done)?.title ?? questSteps(top.title)[0] : '';
    startTimer(top?.id ?? null, a.min, step);
  } else if (a.type === 'pause') pauseTimer();
  else if (a.type === 'resume') resumeTimer();
  else if (a.type === 'finish') finish();
  else if (a.type === 'toggle') {
    const t = s.tasks.find((x) => x.id === a.id);
    if (t) setTaskDone(t.id, t.status !== 'done');
  }
}
