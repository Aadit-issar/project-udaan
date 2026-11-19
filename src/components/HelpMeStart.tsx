import { useEffect, useMemo, useRef, useState } from 'react';
import { explain, dueLabel, rankTasks } from '../domain/priority';
import { questSteps } from '../domain/quest';
import { createTask, setQuest, startTimer, useUdaan } from '../domain/store';
import type { Energy } from '../domain/types';
import { go } from '../router';
import { closeHelp } from '../ui';
import { Icon } from './Icon';

const TIMES = [10, 25, 45, 60];
const ENERGY: { id: Energy; label: string }[] = [
  { id: 'low', label: 'Low' },
  { id: 'steady', label: 'Steady' },
  { id: 'high', label: 'Fired up' },
];

/** Signature interaction: picks one achievable next action from real data and explains why. */
export function HelpMeStart() {
  const s = useUdaan();
  const [avail, setAvail] = useState(25);
  const [energy, setEnergy] = useState<Energy>('steady');
  const [idx, setIdx] = useState(0);
  const [quick, setQuick] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const ranked = useMemo(() => rankTasks(s.tasks, new Date(), avail, energy), [s.tasks, avail, energy]);
  const pick = ranked.length ? ranked[idx % ranked.length] : null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeHelp();
    window.addEventListener('keydown', onKey);
    ref.current?.querySelector<HTMLElement>('button, input')?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const task = pick?.task;
  const step = task ? task.subtasks.find((x) => !x.done)?.title ?? questSteps(task.title)[0] : '';
  const sessionMin = Math.min(avail, Math.max(5, s.settings.focusMin));
  const due = task ? dueLabel(task.dueAt).toLowerCase() : '';
  const subj = task?.subject ? `${task.subject} task` : 'task';

  const begin = (min: number) => {
    if (!task) return;
    startTimer(task.id, min, step);
    closeHelp();
    go('focus');
  };

  return (
    <div className="overlay" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && closeHelp()}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="hms-title" ref={ref}>
        <div className="dialog-head">
          <div>
            <p className="eyebrow">Help Me Start</p>
            <h2 id="hms-title">Your next small step</h2>
          </div>
          <button className="icon-btn" onClick={closeHelp} aria-label="Close"><Icon name="x" /></button>
        </div>
        <div className="dialog-body">
          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <p className="label" id="avail-l">Time you have</p>
              <div className="seg" role="group" aria-labelledby="avail-l">
                {TIMES.map((t) => <button key={t} aria-pressed={avail === t} onClick={() => { setAvail(t); setIdx(0); }}>{t} min</button>)}
              </div>
            </div>
            <div>
              <p className="label" id="energy-l">Energy right now</p>
              <div className="seg" role="group" aria-labelledby="energy-l">
                {ENERGY.map((e) => <button key={e.id} aria-pressed={energy === e.id} onClick={() => { setEnergy(e.id); setIdx(0); }}>{e.label}</button>)}
              </div>
            </div>
          </div>

          {task && pick ? (
            <>
              <div className="reco" aria-live="polite">
                <p className="lead">
                  You have <strong>{avail} minutes</strong>. Your {subj} <strong>“{task.title}”</strong> is {due === 'no deadline' ? 'open-ended' : due.replace('due ', 'due ')}.
                  {' '}Let’s start small.
                </p>
                <div className="step">
                  <Icon name="flag" />
                  <div><small style={{ color: '#ffc68a', fontWeight: 650 }}>FIRST STEP</small><br />{step}</div>
                </div>
                <p className="why">{explain(pick)}</p>
              </div>
              <div className="btn-row">
                <button className="btn btn-primary btn-lg" onClick={() => begin(2)}><Icon name="play" /> Just 2 minutes</button>
                <button className="btn btn-ink btn-lg" onClick={() => begin(sessionMin)}>Focus {sessionMin} min</button>
              </div>
              <div className="btn-row">
                <button className="btn btn-ghost btn-sm" onClick={() => setIdx((i) => i + 1)} disabled={ranked.length < 2}>Choose another task</button>
                <button className="btn btn-ghost btn-sm" onClick={() => { if (!task.subtasks.length) setQuest(task.id, questSteps(task.title)); closeHelp(); go('plan', task.id); }}>
                  Break into steps
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => { closeHelp(); go('plan', task.id); }}>Adjust in planner</button>
              </div>
              {ranked.length > 1 && <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Option {(idx % ranked.length) + 1} of {ranked.length} open tasks · ranked by deadline, importance, effort and your energy.</p>}
            </>
          ) : (
            <form className="card" style={{ boxShadow: 'none' }} onSubmit={(e) => { e.preventDefault(); if (quick.trim()) { createTask({ title: quick, subject: '', importance: 2, dueAt: null, estimateMin: 30 }); setQuick(''); } }}>
              <h3>Nothing on your list yet</h3>
              <p style={{ color: 'var(--ink-soft)', margin: '4px 0 12px' }}>Type one thing you need to do — even a rough one.</p>
              <div className="capture">
                <label className="sr-only" htmlFor="hms-quick">Task</label>
                <input id="hms-quick" className="input" value={quick} onChange={(e) => setQuick(e.target.value)} placeholder="e.g. Revise Chemistry Equilibrium" />
                <button className="btn btn-primary">Add</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
