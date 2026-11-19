import { useEffect, useState } from 'react';
import { Icon } from '../components/Icon';
import { dueLabel, explain, progressOf, rankTasks } from '../domain/priority';
import { detectKind, QUEST_LABEL, questSteps, type QuestKind } from '../domain/quest';
import {
  addStep, createTask, deleteTask, editStep, editTask, moveStep, pinTask, removeStep, restoreTask,
  setQuest, setTaskDone, startTimer, toggleStep, useUdaan, type TaskInput,
} from '../domain/store';
import type { Importance, Task } from '../domain/types';
import { go, useRoute } from '../router';
import { toast } from '../ui';

const SUBJECTS = ['Chemistry', 'Physics', 'Biology', 'Maths', 'English', 'History', 'Geography', 'Computer Science', 'Economics', 'Other'];

function toLocalInput(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

const blank: TaskInput = { title: '', subject: '', importance: 2, dueAt: null, estimateMin: 30 };

function TaskForm({ editing, onDone }: { editing: Task | null; onDone: (id?: string) => void }) {
  const [f, setF] = useState<TaskInput>(blank);
  const [quest, setQuestOn] = useState(true);
  const [err, setErr] = useState('');
  useEffect(() => {
    setF(editing ? { title: editing.title, subject: editing.subject, importance: editing.importance, dueAt: editing.dueAt, estimateMin: editing.estimateMin } : blank);
    setErr('');
  }, [editing]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.title.trim()) { setErr('Give the task a short name so you can recognise it later.'); return; }
    if (editing) {
      editTask(editing.id, f);
      toast('Task updated.');
      onDone(editing.id);
    } else {
      const t = createTask(f, quest);
      toast(quest ? 'Task added and broken into a 5-step quest.' : 'Task added.');
      setF(blank);
      onDone(t.id);
    }
  };

  return (
    <form className="card" onSubmit={submit} noValidate aria-labelledby="form-title">
      <p className="eyebrow">{editing ? 'Edit task' : 'New task'}</p>
      <h2 id="form-title" style={{ marginBottom: 16 }}>{editing ? editing.title : 'What do you need to do?'}</h2>
      <div className="form-grid">
        <div className="field full">
          <label htmlFor="t-title">Task</label>
          <input id="t-title" className="input" value={f.title} maxLength={140} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. Revise Chemistry Equilibrium" aria-invalid={!!err} aria-describedby={err ? 't-err' : undefined} />
          {err && <p id="t-err" role="alert" style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>{err}</p>}
        </div>
        <div className="field">
          <label htmlFor="t-subject">Subject</label>
          <input id="t-subject" className="input" list="subjects" value={f.subject} maxLength={40} onChange={(e) => setF({ ...f, subject: e.target.value })} placeholder="Chemistry" />
          <datalist id="subjects">{SUBJECTS.map((s) => <option key={s} value={s} />)}</datalist>
        </div>
        <div className="field">
          <label htmlFor="t-due">Deadline (optional)</label>
          <input id="t-due" className="input" type="datetime-local" value={toLocalInput(f.dueAt)} onChange={(e) => setF({ ...f, dueAt: e.target.value ? new Date(e.target.value).toISOString() : null })} />
        </div>
        <div className="field">
          <span className="label" id="imp-l">Importance</span>
          <div className="seg" role="group" aria-labelledby="imp-l">
            {([1, 2, 3] as Importance[]).map((n) => (
              <button type="button" key={n} aria-pressed={f.importance === n} onClick={() => setF({ ...f, importance: n })}>{['Low', 'Medium', 'High'][n - 1]}</button>
            ))}
          </div>
        </div>
        <div className="field">
          <label htmlFor="t-est">Estimated time (min)</label>
          <input id="t-est" className="input" type="number" min={5} max={600} step={5} value={f.estimateMin} onChange={(e) => setF({ ...f, estimateMin: Math.max(5, Math.min(600, Number(e.target.value) || 5)) })} />
        </div>
        {!editing && (
          <label className="full" style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: '0.92rem' }}>
            <input type="checkbox" checked={quest} onChange={(e) => setQuestOn(e.target.checked)} style={{ width: 18, height: 18, accentColor: 'var(--amber)' }} />
            Break it into a Task Quest automatically
          </label>
        )}
      </div>
      <div className="btn-row" style={{ marginTop: 18 }}>
        <button className="btn btn-primary">{editing ? 'Save changes' : <><Icon name="plus" /> Add task</>}</button>
        {editing && <button type="button" className="btn btn-ghost" onClick={() => onDone()}>Cancel</button>}
      </div>
    </form>
  );
}

function Quest({ task }: { task: Task }) {
  const [kind, setKind] = useState<QuestKind>(detectKind(task.title));
  const [newStep, setNewStep] = useState('');
  const pct = progressOf(task);
  const regenerate = () => {
    if (task.subtasks.some((s) => s.done) && !confirm('Replace your current steps (including completed ones)?')) return;
    setQuest(task.id, questSteps(task.title, kind));
  };
  return (
    <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <h3><Icon name="flag" size={16} /> Task Quest</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <label className="sr-only" htmlFor={`kind-${task.id}`}>Quest template</label>
          <select id={`kind-${task.id}`} className="input" style={{ minHeight: 36, padding: '4px 10px', width: 'auto' }} value={kind} onChange={(e) => setKind(e.target.value as QuestKind)}>
            {(Object.keys(QUEST_LABEL) as QuestKind[]).map((k) => <option key={k} value={k}>{QUEST_LABEL[k]}</option>)}
          </select>
          <button className="btn btn-ghost btn-sm" onClick={regenerate}><Icon name="wand" size={16} /> {task.subtasks.length ? 'Regenerate' : 'Generate steps'}</button>
        </div>
      </div>
      {task.subtasks.length > 0 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '12px 0 4px' }}>
            <div className="bar teal" style={{ flex: 1 }} role="progressbar" aria-label="Quest progress" aria-valuenow={Math.round(pct * 100)} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${pct * 100}%` }} /></div>
            <span style={{ fontSize: '0.85rem', fontWeight: 650 }}>{task.subtasks.filter((s) => s.done).length}/{task.subtasks.length}</span>
          </div>
          <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {task.subtasks.map((st, i) => (
              <li key={st.id} className={`quest-step${st.done ? ' done' : ''}`}>
                <button className="check" role="checkbox" aria-checked={st.done} aria-label={`${st.done ? 'Reopen' : 'Complete'} step ${i + 1}`} onClick={() => toggleStep(task.id, st.id)}>
                  {st.done && <Icon name="check" size={16} stroke={3} />}
                </button>
                <span className="step-num" aria-hidden="true">{i + 1}</span>
                <input className="input" aria-label={`Step ${i + 1}`} defaultValue={st.title} maxLength={140} onBlur={(e) => e.target.value.trim() && e.target.value !== st.title && editStep(task.id, st.id, e.target.value)} />
                <div style={{ display: 'flex' }}>
                  <button className="icon-btn" aria-label="Move step up" disabled={i === 0} onClick={() => moveStep(task.id, st.id, -1)}><Icon name="up" size={16} /></button>
                  <button className="icon-btn" aria-label="Move step down" disabled={i === task.subtasks.length - 1} onClick={() => moveStep(task.id, st.id, 1)}><Icon name="down" size={16} /></button>
                  <button className="icon-btn" aria-label="Remove step" onClick={() => removeStep(task.id, st.id)}><Icon name="x" size={16} /></button>
                </div>
              </li>
            ))}
          </ol>
        </>
      )}
      <form className="capture" style={{ marginTop: 10 }} onSubmit={(e) => { e.preventDefault(); if (newStep.trim()) { addStep(task.id, newStep); setNewStep(''); } }}>
        <label className="sr-only" htmlFor={`ns-${task.id}`}>Add a step</label>
        <input id={`ns-${task.id}`} className="input" value={newStep} onChange={(e) => setNewStep(e.target.value)} placeholder="Add your own step" maxLength={140} />
        <button className="btn btn-ghost">Add</button>
      </form>
    </div>
  );
}

export function Planner() {
  const s = useUdaan();
  const { param } = useRoute();
  const [editing, setEditing] = useState<Task | null>(null);
  const [showDone, setShowDone] = useState(false);
  const ranked = rankTasks(s.tasks);
  const done = s.tasks.filter((t) => t.status === 'done');
  const selected = param;

  const remove = (t: Task) => {
    const removed = deleteTask(t.id);
    if (editing?.id === t.id) setEditing(null);
    if (removed) toast(`Deleted “${t.title}”.`, { label: 'Undo', run: () => restoreTask(removed) });
  };

  const card = (t: Task, i: number | null, why?: string) => {
    const isSel = selected === t.id;
    return (
      <article key={t.id} className={`task-card${isSel ? ' selected' : ''}`} aria-label={t.title}>
        <div className="top">
          <button className="check" role="checkbox" aria-checked={t.status === 'done'} aria-label={t.status === 'done' ? `Reopen “${t.title}”` : `Mark “${t.title}” done`} onClick={() => setTaskDone(t.id, t.status !== 'done')}>
            {t.status === 'done' && <Icon name="check" size={16} stroke={3} />}
          </button>
          <button className="open" onClick={() => go('plan', isSel ? undefined : t.id)} aria-expanded={isSel}>
            <span style={{ fontWeight: 650, textDecoration: t.status === 'done' ? 'line-through' : 'none' }}>
              {i !== null && <span style={{ color: 'var(--amber-deep)', fontFamily: 'var(--display)', marginRight: 8 }}>{i + 1}</span>}
              {t.title}
            </span>
            <span className="meta" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
              <span className="chip chip-sky">{dueLabel(t.dueAt)}</span>
              {t.subject && <span className="chip">{t.subject}</span>}
              <span className="chip">{['Low', 'Medium', 'High'][t.importance - 1]} importance</span>
              <span className="chip">~{t.estimateMin} min</span>
              {t.subtasks.length > 0 && <span className="chip chip-teal">{Math.round(progressOf(t) * 100)}% quest</span>}
              {t.pinned && <span className="chip chip-amber">Your pick</span>}
            </span>
            {why && <p className="why-line">{why}</p>}
          </button>
          <div style={{ display: 'flex' }}>
            {t.status !== 'done' && (
              <button className="icon-btn" aria-label={t.pinned ? 'Remove manual priority' : 'Make this my top priority'} aria-pressed={t.pinned} onClick={() => pinTask(t.id)} style={t.pinned ? { color: 'var(--amber-deep)' } : undefined}>
                <Icon name="pin" size={18} />
              </button>
            )}
            <button className="icon-btn" aria-label={`Edit “${t.title}”`} onClick={() => { setEditing(t); window.scrollTo({ top: 0, behavior: 'smooth' }); }}><Icon name="edit" size={18} /></button>
            <button className="icon-btn" aria-label={`Delete “${t.title}”`} onClick={() => remove(t)}><Icon name="trash" size={18} /></button>
          </div>
        </div>
        {isSel && (
          <>
            {t.status !== 'done' && (
              <div className="btn-row" style={{ marginTop: 12 }}>
                <button className="btn btn-primary btn-sm" onClick={() => { startTimer(t.id, 2, t.subtasks.find((x) => !x.done)?.title ?? questSteps(t.title)[0]); go('focus'); }}><Icon name="play" size={16} /> Just 2 minutes</button>
                <button className="btn btn-ink btn-sm" onClick={() => { startTimer(t.id, s.settings.focusMin, t.subtasks.find((x) => !x.done)?.title ?? ''); go('focus'); }}>Focus {s.settings.focusMin} min</button>
              </div>
            )}
            <Quest task={t} />
          </>
        )}
      </article>
    );
  };

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Priority Planner</p>
          <h1>Plan the flight path</h1>
          <p>Ranked by deadline, importance and effort. Pin a task to override the suggestion — your choice always wins.</p>
        </div>
      </div>
      <div className="grid planner">
        <TaskForm editing={editing} onDone={(id) => { setEditing(null); if (id) go('plan', id); }} />
        <section aria-labelledby="list-title">
          <h2 id="list-title" className="sr-only">Tasks</h2>
          {ranked.length === 0 ? (
            <div className="card empty">
              <Icon name="plan" size={36} />
              <h3>No open tasks</h3>
              <p>Add your first task — UDAAN will rank it and suggest a first step.</p>
            </div>
          ) : (
            ranked.map((r, i) => card(r.task, i, i === 0 ? explain(r) : undefined))
          )}
          {done.length > 0 && (
            <div style={{ marginTop: 18 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowDone((v) => !v)} aria-expanded={showDone}>
                {showDone ? 'Hide' : 'Show'} completed ({done.length})
              </button>
              {showDone && <div style={{ marginTop: 10 }}>{done.map((t) => card(t, null))}</div>}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
