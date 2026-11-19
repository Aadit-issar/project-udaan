import { useEffect, useRef, useState } from 'react';
import { Icon } from '../components/Icon';
import { Stage3D } from '../components/Stage3D';
import { rankTasks } from '../domain/priority';
import { questSteps } from '../domain/quest';
import { createTask, finishTimer, pauseTimer, resetTimer, resumeTimer, startTimer, useMode, useUdaan } from '../domain/store';
import { timerView, useNow } from '../hooks';
import { handleSceneAction, sceneDataFor } from '../sceneData';
import { toast } from '../ui';

function chime() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [660, 880].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = f;
      o.type = 'sine';
      g.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.25);
      g.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + i * 0.25 + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.25 + 1.2);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + i * 0.25);
      o.stop(ctx.currentTime + i * 0.25 + 1.3);
    });
    setTimeout(() => ctx.close(), 2000);
  } catch { /* audio unavailable — silent is fine */ }
}

export function Focus() {
  const s = useUdaan();
  const mode = useMode();
  const running = !!s.timer && !s.timer.pausedAt;
  const now = useNow(running ? 250 : 1000);
  const tv = timerView(s, now);
  const ranked = rankTasks(s.tasks);
  const [taskId, setTaskId] = useState<string>('');
  const [minutes, setMinutes] = useState(s.settings.focusMin);
  const [intention, setIntention] = useState('');
  const [asking, setAsking] = useState(false);
  const [zen, setZen] = useState(false);
  const [later, setLater] = useState('');
  const [threeD, setThreeD] = useState(!s.settings.lowPerf);
  const chimed = useRef<string | null>(null);
  const finishing = useRef(false);

  const chosen = taskId || ranked[0]?.task.id || '';
  const chosenTask = s.tasks.find((t) => t.id === chosen);
  const activeTask = s.timer ? s.tasks.find((t) => t.id === s.timer!.taskId) : null;

  useEffect(() => {
    if (chosenTask && !s.timer) setIntention(chosenTask.subtasks.find((x) => !x.done)?.title ?? questSteps(chosenTask.title)[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chosen]);

  // Timer reached zero → chime once and ask for confirmation.
  useEffect(() => {
    if (s.timer && tv.done && chimed.current !== s.timer.sessionId) {
      chimed.current = s.timer.sessionId;
      if (s.settings.sound) chime();
      setAsking(true);
    }
  }, [tv.done, s.timer, s.settings.sound]);

  // Keep the screen awake during a running session where supported.
  useEffect(() => {
    if (!running || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    navigator.wakeLock.request('screen').then((l) => { lock = l; }).catch(() => {});
    return () => { lock?.release().catch(() => {}); };
  }, [running]);

  const finish = (confirmed: boolean, simulate = false) => {
    if (finishing.current) return; // guards double clicks
    finishing.current = true;
    finishTimer(confirmed, { simulateFull: simulate });
    setAsking(false);
    setZen(false);
    toast(confirmed ? 'Session saved. Your Skyworld grew a little.' : 'Session saved without XP. Starting again is always allowed.');
    setTimeout(() => { finishing.current = false; }, 300);
  };

  const start = (min: number) => {
    startTimer(chosen || null, min, intention.trim());
    chimed.current = null;
  };

  const history = [...s.sessions].reverse().slice(0, 5);

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">SmartFocus · Virtual Focus Room</p>
          <h1>Settle in. One thing at a time.</h1>
          <p>Your timer is saved with real timestamps, so reloading or switching tabs never loses your session.</p>
        </div>
        <div className="btn-row">
          <button className="btn btn-ghost btn-sm" aria-pressed={threeD} onClick={() => setThreeD((v) => !v)}>
            <Icon name={threeD ? 'focus' : 'cube'} size={16} /> {threeD ? 'Switch to 2D' : 'Show 3D room'}
          </button>
        </div>
      </div>

      <div className="grid dash">
        <div>
          {threeD ? (
            <Stage3D
              kind="room"
              label="Virtual Focus Room: a study desk on a floating platform above the clouds, with your task board and timer."
              data={sceneDataFor(s, now)}
              lowPerf={s.settings.lowPerf}
              reducedMotion={s.settings.reducedMotion}
              onAction={(a) => handleSceneAction(s, a, () => setAsking(true))}
            />
          ) : (
            <div className="card" style={{ display: 'grid', gap: 10 }}>
              <p className="eyebrow">Lightweight mode</p>
              <h2>{activeTask?.title ?? chosenTask?.title ?? 'Open focus'}</h2>
              <p style={{ color: 'var(--ink-soft)' }}>The 3D room is off. Every focus feature works the same in this 2D view.</p>
            </div>
          )}

          <div className="card" style={{ marginTop: 20 }}>
            <h3><Icon name="flag" size={16} /> Before you start</h3>
            <ul style={{ margin: '10px 0 0', paddingLeft: 18, color: 'var(--ink-soft)', fontSize: '0.9rem', display: 'grid', gap: 6 }}>
              <li>Turn on your device’s <b>Do Not Disturb</b> or Focus mode — UDAAN can’t silence other apps from a browser, but your phone can.</li>
              <li>Put your phone face-down or in another room if you’re studying on a laptop.</li>
              <li>Had a stray thought? Capture it below and get back to work.</li>
            </ul>
          </div>
        </div>

        <aside style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
          <section className="timer-card" aria-labelledby="timer-title">
            <p className="eyebrow" style={{ color: '#ffc68a' }} id="timer-title">
              {tv.state === 'idle' ? 'Ready when you are' : tv.state === 'paused' ? 'Paused' : 'In focus'}
              {s.timer?.demo && ' · demo'}
            </p>
            {s.timer ? (
              <>
                <h2 style={{ color: '#fff', marginTop: 8 }}>{activeTask?.title ?? 'Open focus'}</h2>
                {s.timer.intention && <p className="muted" style={{ marginTop: 6 }}>I will: {s.timer.intention}</p>}
                <div className="time" role="timer" aria-live="off">{tv.remaining}</div>
                <div className="ring" style={{ ['--p' as string]: tv.pct }}><i /></div>
                <div className="btn-row" style={{ marginTop: 18 }}>
                  {tv.state === 'paused' ? (
                    <button className="btn btn-primary" onClick={resumeTimer}><Icon name="play" size={16} /> Resume</button>
                  ) : (
                    <button className="btn btn-primary" onClick={pauseTimer} disabled={tv.done}><Icon name="pause" size={16} /> Pause</button>
                  )}
                  <button className="btn btn-light" onClick={() => setAsking(true)}><Icon name="check" size={16} /> Finish</button>
                  <button className="btn btn-light" onClick={() => setZen(true)} aria-label="Fullscreen focus"><Icon name="expand" size={16} /></button>
                  <button className="btn btn-light" onClick={() => { if (confirm('Reset this session? It won’t be saved.')) resetTimer(); }} aria-label="Reset session"><Icon name="stop" size={16} /></button>
                </div>
                {mode === 'demo' && (
                  <button className="btn btn-sm" style={{ marginTop: 12, background: 'rgba(240,138,36,0.18)', color: '#ffc68a' }} onClick={() => finish(true, true)}>
                    Demo: skip to the end of this session
                  </button>
                )}
              </>
            ) : (
              <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
                <div className="field">
                  <label htmlFor="f-task" style={{ color: '#c7cde8' }}>Task</label>
                  <select id="f-task" className="input" value={chosen} onChange={(e) => setTaskId(e.target.value)}>
                    <option value="">Open focus (no task)</option>
                    {ranked.map((r) => <option key={r.task.id} value={r.task.id}>{r.task.title}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="f-int" style={{ color: '#c7cde8' }}>During this session, I will…</label>
                  <input id="f-int" className="input" value={intention} maxLength={140} onChange={(e) => setIntention(e.target.value)} placeholder="Solve five practice questions" />
                </div>
                <div className="field">
                  <span className="label" style={{ color: '#c7cde8' }} id="dur-l">Length: {minutes} min</span>
                  <input aria-labelledby="dur-l" type="range" min={5} max={90} step={5} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} style={{ accentColor: 'var(--amber)' }} />
                </div>
                <div className="btn-row">
                  <button className="btn btn-primary" onClick={() => start(minutes)}><Icon name="play" size={16} /> Start {minutes} min</button>
                  <button className="btn btn-light" onClick={() => start(2)}>Just 2 minutes</button>
                </div>
                {mode === 'demo' && <button className="btn btn-light btn-sm" onClick={() => start(1)}>Demo: 1-minute session</button>}
              </div>
            )}
          </section>

          <section className="card" aria-labelledby="later-title">
            <h3 id="later-title">Remember this later</h3>
            <p style={{ color: 'var(--ink-soft)', fontSize: '0.86rem', margin: '4px 0 10px' }}>Park distractions as tasks without leaving your session.</p>
            <form className="capture" onSubmit={(e) => { e.preventDefault(); if (!later.trim()) return; createTask({ title: later, subject: 'Later', importance: 1, dueAt: null, estimateMin: 10 }); setLater(''); toast('Parked in your planner.'); }}>
              <label className="sr-only" htmlFor="later">Distraction to remember</label>
              <input id="later" className="input" value={later} onChange={(e) => setLater(e.target.value)} placeholder="Reply to Riya about the project" maxLength={140} />
              <button className="btn btn-ghost">Park</button>
            </form>
          </section>

          <section className="card" aria-labelledby="hist-title">
            <h3 id="hist-title">Recent sessions</h3>
            {history.length === 0 ? (
              <p style={{ color: 'var(--muted)', fontSize: '0.88rem', marginTop: 6 }}>No sessions yet. Even two minutes counts.</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 0', display: 'grid', gap: 8, fontSize: '0.88rem' }}>
                {history.map((h) => (
                  <li key={h.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.taskTitle}</span>
                    <span className={`chip ${h.focusedMin > 0 ? 'chip-teal' : ''}`}>{h.focusedMin > 0 ? `${h.focusedMin} min focused` : 'not counted'}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>

      {zen && s.timer && (
        <div className="zen" role="dialog" aria-modal="true" aria-label="Fullscreen focus">
          <div>
            <p className="eyebrow" style={{ color: '#ffc68a' }}>{activeTask?.title ?? 'Open focus'}</p>
            <div className="time" role="timer">{tv.remaining}</div>
            {s.timer.intention && <p style={{ color: '#c7cde8', marginTop: 10 }}>I will: {s.timer.intention}</p>}
            <div className="btn-row" style={{ justifyContent: 'center', marginTop: 28 }}>
              {tv.state === 'paused'
                ? <button className="btn btn-primary" onClick={resumeTimer}>Resume</button>
                : <button className="btn btn-light" onClick={pauseTimer}>Pause</button>}
              <button className="btn btn-light" onClick={() => setZen(false)}>Exit fullscreen</button>
            </div>
          </div>
        </div>
      )}

      {asking && s.timer && (
        <div className="overlay" role="presentation" onClick={(e) => e.target === e.currentTarget && setAsking(false)}>
          <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="ask-title">
            <div className="dialog-body" style={{ display: 'grid', gap: 14 }}>
              <p className="eyebrow">{tv.done ? 'Session complete' : 'Finishing early'}</p>
              <h2 id="ask-title">{tv.done ? 'You did it. Were you mostly focused?' : 'Wrap up this session?'}</h2>
              <p style={{ color: 'var(--ink-soft)' }}>
                UDAAN only measures time, not attention — so it asks you. Honest answers keep your Skyworld meaningful. Either way, the session is saved.
              </p>
              <div className="btn-row">
                <button className="btn btn-primary" autoFocus onClick={() => finish(true)}>Yes, count it</button>
                <button className="btn btn-ghost" onClick={() => finish(false)}>Not really — save without XP</button>
                {!tv.done && <button className="btn btn-ghost" onClick={() => setAsking(false)}>Keep going</button>}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
