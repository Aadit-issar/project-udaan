import { useState } from 'react';
import { Icon } from '../components/Icon';
import { WorldSvg } from '../components/WorldSvg';
import { dueLabel, explain, progressOf, rankTasks } from '../domain/priority';
import { createTask, setTaskDone, useMode, useUdaan } from '../domain/store';
import { greeting, todayStats } from '../hooks';
import { go, href } from '../router';
import { openHelp, toast } from '../ui';

export function Dashboard() {
  const s = useUdaan();
  const mode = useMode();
  const [quick, setQuick] = useState('');
  const stats = todayStats(s);
  const ranked = rankTasks(s.tasks);
  const done = s.tasks.filter((t) => t.status === 'done').sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? '')).slice(0, 3);
  const now = new Date();
  const name = s.settings.name.trim();
  const recent = [...s.events].reverse().slice(0, 4);
  const open = ranked.length;

  return (
    <>
      <div className="grid dash">
        <section className="horizon" aria-labelledby="hero-title">
          <svg className="path" viewBox="0 0 800 340" preserveAspectRatio="none" aria-hidden="true">
            <path d="M-20 300 C 200 280, 360 200, 520 150 S 760 60, 840 40" stroke="rgba(255,198,138,0.55)" strokeWidth="1.5" fill="none" strokeDasharray="2 7" />
            <path d="M640 104 l26 -8 l-14 16 z" fill="#fffaf0" opacity="0.9" />
          </svg>
          <p className="eyebrow">{now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h1 id="hero-title">
            {greeting(now)}{name ? `, ${name}` : ''}. <em>{open ? 'One small step first.' : 'Clear skies today.'}</em>
          </h1>
          <p className="sub">
            {open
              ? `You have ${open} open ${open === 1 ? 'task' : 'tasks'}. Let UDAAN pick a starting point that fits the time and energy you have.`
              : 'Nothing pending. Add what’s next, or enjoy the rest — breaks are part of the plan.'}
          </p>
          <div className="actions">
            <button className="btn btn-primary btn-lg" onClick={openHelp}><Icon name="spark" /> Help Me Start</button>
            <a className="btn btn-light btn-lg" href={href('focus')}><Icon name="focus" /> Focus Room</a>
          </div>
          <div className="stats">
            <div className="stat"><b>{stats.focusMin}<small style={{ fontSize: '0.9rem' }}> min</small></b><span>focused today</span></div>
            <div className="stat"><b>{stats.tasksDone}</b><span>tasks done today</span></div>
            <div className="stat"><b>{stats.xp}</b><span>XP · Lv {stats.level.stage.level}</span></div>
          </div>
        </section>

        <aside className="card" style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div>
              <p className="eyebrow">Daily goal</p>
              <h2>{stats.focusMin} / {s.settings.dailyGoalMin} min</h2>
            </div>
            <span className={`chip ${stats.goalPct >= 1 ? 'chip-teal' : 'chip-amber'}`}>{stats.goalPct >= 1 ? 'Goal reached' : `${Math.round(stats.goalPct * 100)}%`}</span>
          </div>
          <div className="bar teal" role="progressbar" aria-label="Daily focus goal" aria-valuenow={Math.round(stats.goalPct * 100)} aria-valuemin={0} aria-valuemax={100}>
            <i style={{ width: `${stats.goalPct * 100}%` }} />
          </div>
          <a href={href('world')} aria-label="Open Progress World" style={{ display: 'block' }}>
            <WorldSvg level={stats.level.stage.level} />
          </a>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <h3>{stats.level.stage.name}</h3>
              <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>{stats.level.next ? `${stats.level.next.xp - stats.xp} XP to ${stats.level.next.name}` : 'All unlocked'}</span>
            </div>
            <div className="bar" style={{ marginTop: 8 }}><i style={{ width: `${stats.level.pct * 100}%` }} /></div>
          </div>
          {recent.length > 0 && (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 6, fontSize: '0.86rem', color: 'var(--ink-soft)' }}>
              {recent.map((e) => (
                <li key={e.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.label}</span>
                  <b style={{ color: 'var(--amber-deep)' }}>+{e.xp}</b>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>

      <div className="grid dash" style={{ marginTop: 20 }}>
        <section className="card" aria-labelledby="pri-title">
          <div className="page-head" style={{ marginBottom: 8 }}>
            <div>
              <p className="eyebrow">Today’s priorities</p>
              <h2 id="pri-title">What matters right now</h2>
            </div>
            <a className="btn btn-ghost btn-sm" href={href('plan')}>Open planner</a>
          </div>
          <form
            className="capture"
            style={{ margin: '8px 0 6px' }}
            onSubmit={(e) => {
              e.preventDefault();
              if (!quick.trim()) return;
              createTask({ title: quick, subject: '', importance: 2, dueAt: null, estimateMin: 30 });
              setQuick('');
              toast('Task added. Set a deadline in the planner for smarter suggestions.');
            }}
          >
            <label className="sr-only" htmlFor="quick-add">Quick add a task</label>
            <input id="quick-add" className="input" value={quick} onChange={(e) => setQuick(e.target.value)} placeholder="Add a task — e.g. Revise Chemistry Equilibrium" maxLength={140} />
            <button className="btn btn-ink" aria-label="Add task"><Icon name="plus" /></button>
          </form>
          {ranked.length === 0 && done.length === 0 ? (
            <div className="empty">
              <Icon name="glider" size={36} />
              <h3>Your runway is clear</h3>
              <p>Add one assignment above. UDAAN will help you take the first step.</p>
            </div>
          ) : (
            <div>
              {ranked.slice(0, 5).map((r, i) => (
                <div className="task-row" key={r.task.id}>
                  <button className="check" role="checkbox" aria-checked={false} aria-label={`Mark “${r.task.title}” done`} onClick={() => { setTaskDone(r.task.id, true); toast(`Nice — “${r.task.title}” done. +40 XP`); }} />
                  <div style={{ minWidth: 0 }}>
                    <button className="title" onClick={() => go('plan', r.task.id)} style={{ background: 'none', border: 0, padding: 0, textAlign: 'left' }}>{r.task.title}</button>
                    <div className="meta">
                      <span className={`chip ${dueLabel(r.task.dueAt).startsWith('Overdue') || dueLabel(r.task.dueAt) === 'Due today' ? 'chip-coral' : 'chip-sky'}`}><Icon name="clock" size={13} />{dueLabel(r.task.dueAt)}</span>
                      {r.task.subject && <span className="chip">{r.task.subject}</span>}
                      <span className="chip">~{r.task.estimateMin} min</span>
                      {r.task.subtasks.length > 0 && <span className="chip chip-teal">{Math.round(progressOf(r.task) * 100)}% of quest</span>}
                      {r.task.pinned && <span className="chip chip-amber"><Icon name="pin" size={13} />Your pick</span>}
                    </div>
                    {i === 0 && <p className="why-line">{explain(r)}</p>}
                  </div>
                  <span className="rank" aria-label={`Priority ${i + 1}`}>{i + 1}</span>
                </div>
              ))}
              {done.map((t) => (
                <div className="task-row done" key={t.id}>
                  <button className="check" role="checkbox" aria-checked={true} aria-label={`Reopen “${t.title}”`} onClick={() => setTaskDone(t.id, false)}><Icon name="check" size={16} stroke={3} /></button>
                  <div><span className="title">{t.title}</span></div>
                  <span className="chip chip-teal">Done</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card" style={{ display: 'grid', gap: 12, alignContent: 'start', background: 'linear-gradient(160deg, #fffdf8, #fbeedd)' }}>
          <p className="eyebrow">Immersive</p>
          <h2>Step into the Focus Room</h2>
          <p style={{ color: 'var(--ink-soft)' }}>
            A calm study platform above the clouds with your task board and timer. Works on any screen — and in genuine immersive VR on WebXR headsets such as Meta Quest.
          </p>
          <div className="btn-row">
            <a className="btn btn-ink" href={href('focus')}><Icon name="vr" /> Open Focus Room</a>
            <a className="btn btn-ghost" href={href('world')}><Icon name="world" /> Progress World</a>
          </div>
          {mode === 'demo' && <p style={{ fontSize: '0.85rem', color: 'var(--amber-deep)', fontWeight: 600 }}>Demo mode: sample data only. Your real tasks are untouched.</p>}
        </section>
      </div>
    </>
  );
}
