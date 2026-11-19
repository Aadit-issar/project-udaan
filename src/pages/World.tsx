import { useState } from 'react';
import { Icon } from '../components/Icon';
import { Stage3D } from '../components/Stage3D';
import { WorldSvg } from '../components/WorldSvg';
import { STAGES } from '../domain/progress';
import { useUdaan } from '../domain/store';
import { todayStats, useNow } from '../hooks';
import { handleSceneAction, sceneDataFor } from '../sceneData';
import { toast } from '../ui';

export function World() {
  const s = useUdaan();
  const now = useNow(5000);
  const { xp, level } = todayStats(s);
  const [threeD, setThreeD] = useState(!s.settings.lowPerf);
  const lv = level.stage.level;
  const events = [...s.events].reverse();

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Progress World · Level {lv}</p>
          <h1>{level.stage.name}</h1>
          <p>Your Skyworld grows only from real work: completed tasks, quest steps and focus sessions you confirmed.</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => setThreeD((v) => !v)} aria-pressed={threeD}>
          <Icon name={threeD ? 'world' : 'cube'} size={16} /> {threeD ? 'Show 2D view' : 'Show 3D world'}
        </button>
      </div>

      <div className="grid dash">
        <div>
          {threeD ? (
            <Stage3D
              kind="world"
              label={`Your Skyworld at level ${lv}, ${level.stage.name}.`}
              data={sceneDataFor(s, now)}
              lowPerf={s.settings.lowPerf}
              reducedMotion={s.settings.reducedMotion}
              onAction={(a) => handleSceneAction(s, a, () => {})}
              onInspect={(label) => toast(label)}
            />
          ) : (
            <div className="card" style={{ padding: 12, background: '#0f1838' }}>
              <WorldSvg level={lv} title={`Skyworld at level ${lv}`} />
            </div>
          )}
          <div className="card" style={{ marginTop: 20, display: 'grid', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <h3>{xp} XP earned</h3>
              <span style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>{level.next ? `${level.next.xp - xp} XP until ${level.next.name}` : 'Every island unlocked'}</span>
            </div>
            <div className="bar" role="progressbar" aria-label="Progress to next level" aria-valuenow={Math.round(level.pct * 100)} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${level.pct * 100}%` }} /></div>
            <p style={{ fontSize: '0.86rem', color: 'var(--ink-soft)' }}>
              Task done +40 · Quest step +8 · Confirmed focus +2/min (min 4). Reopening and re-completing a task never pays twice. No streaks to lose — you can always pick up where you left off.
            </p>
          </div>
        </div>

        <aside style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
          <section className="card" aria-labelledby="unlock-title">
            <h3 id="unlock-title" style={{ marginBottom: 12 }}>Milestones</h3>
            <ol className="unlocks" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {STAGES.map((st) => {
                const got = xp >= st.xp;
                return (
                  <li key={st.level} className={`unlock${got ? '' : ' locked'}`}>
                    <span className="lv" aria-hidden="true">{got ? <Icon name="check" size={16} stroke={3} /> : st.level}</span>
                    <div style={{ minWidth: 0 }}>
                      <b style={{ fontSize: '0.92rem' }}>{st.name}</b>
                      <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{st.unlock} · {got ? 'Unlocked' : `${st.xp} XP`}</div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
          <section className="card" aria-labelledby="log-title">
            <h3 id="log-title">Progress log</h3>
            {events.length === 0 ? (
              <p style={{ color: 'var(--muted)', fontSize: '0.88rem', marginTop: 6 }}>Complete a task or a focus session to see your first entry.</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 0', display: 'grid', gap: 8, fontSize: '0.86rem', maxHeight: 280, overflow: 'auto' }}>
                {events.map((e) => (
                  <li key={e.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.label}</span>
                    <b style={{ color: 'var(--amber-deep)', flex: 'none' }}>+{e.xp}</b>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
