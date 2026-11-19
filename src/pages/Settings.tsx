import { useRef, useState } from 'react';
import { Icon } from '../components/Icon';
import { clearAll, exportJson, importJson, replaceState, setOnboarded, switchMode, updateSettings, useMode, useUdaan } from '../domain/store';
import type { Settings as S } from '../domain/types';
import { toast } from '../ui';

function Toggle({ label, hint, on, set }: { label: string; hint: string; on: boolean; set: (v: boolean) => void }) {
  return (
    <div className="toggle">
      <div>
        <b style={{ fontSize: '0.94rem' }}>{label}</b>
        <div style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>{hint}</div>
      </div>
      <button className="switch" role="switch" aria-checked={on} aria-label={label} onClick={() => set(!on)} />
    </div>
  );
}

export function Settings() {
  const s = useUdaan();
  const mode = useMode();
  const st = s.settings;
  const file = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(st.name);
  const [notif, setNotif] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'unsupported');
  const set = (p: Partial<S>) => updateSettings(p);

  const download = () => {
    const blob = new Blob([exportJson()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `udaan-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast('Backup downloaded.');
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    try {
      const next = importJson(await f.text());
      if (confirm(`Replace your current data with this backup (${next.tasks.length} tasks, ${next.sessions.length} sessions)?`)) {
        replaceState(next);
        toast('Backup restored.');
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : 'That file could not be read.');
    } finally {
      if (file.current) file.current.value = '';
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Settings</p>
          <h1>Make UDAAN yours</h1>
          <p>Everything is stored on this device only. No account, no tracking, no servers.</p>
        </div>
      </div>
      <div className="grid settings">
        <section className="card" aria-labelledby="s-you">
          <h2 id="s-you" style={{ marginBottom: 14 }}>You & your day</h2>
          <form className="field" onSubmit={(e) => { e.preventDefault(); set({ name: name.trim().slice(0, 40) }); toast('Name saved.'); }}>
            <label htmlFor="s-name">Nickname</label>
            <div className="capture">
              <input id="s-name" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="What should UDAAN call you?" />
              <button className="btn btn-ghost">Save</button>
            </div>
          </form>
          <div className="field" style={{ marginTop: 16 }}>
            <span className="label" id="s-len">Default focus length: {st.focusMin} min</span>
            <input aria-labelledby="s-len" type="range" min={5} max={90} step={5} value={st.focusMin} onChange={(e) => set({ focusMin: Number(e.target.value) })} style={{ accentColor: 'var(--amber)' }} />
          </div>
          <div className="field" style={{ marginTop: 16 }}>
            <span className="label" id="s-goal">Daily focus target: {st.dailyGoalMin} min</span>
            <input aria-labelledby="s-goal" type="range" min={10} max={300} step={10} value={st.dailyGoalMin} onChange={(e) => set({ dailyGoalMin: Number(e.target.value) })} style={{ accentColor: 'var(--amber)' }} />
          </div>
        </section>

        <section className="card" aria-labelledby="s-exp">
          <h2 id="s-exp" style={{ marginBottom: 6 }}>Experience</h2>
          <Toggle label="Reduce motion" hint="Stops animations, auto-rotation and drifting clouds." on={st.reducedMotion} set={(v) => set({ reducedMotion: v })} />
          <Toggle label="Low-performance mode" hint="Starts in 2D and uses a lighter 3D scene for older devices." on={st.lowPerf} set={(v) => set({ lowPerf: v })} />
          <Toggle label="Session chime" hint="A soft two-note chime when a focus session ends." on={st.sound} set={(v) => set({ sound: v })} />
          <div className="toggle">
            <div>
              <b style={{ fontSize: '0.94rem' }}>Browser notifications</b>
              <div style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                {notif === 'unsupported' ? 'Not supported in this browser.' : notif === 'granted' ? 'Allowed. UDAAN stays quiet during sessions.' : notif === 'denied' ? 'Blocked in browser settings.' : 'Optional. Only asked when you press the button.'}
              </div>
            </div>
            {notif === 'default' && (
              <button className="btn btn-ghost btn-sm" onClick={async () => setNotif(await Notification.requestPermission())}>Allow</button>
            )}
          </div>
        </section>

        <section className="card" aria-labelledby="s-data">
          <h2 id="s-data" style={{ marginBottom: 6 }}>Your data</h2>
          <p style={{ color: 'var(--ink-soft)', fontSize: '0.9rem' }}>
            {mode === 'demo' ? 'You are in demo mode. Backups and clearing apply to the sample data only.' : 'Stored in this browser’s local storage and available offline.'}
          </p>
          <div className="btn-row" style={{ marginTop: 14 }}>
            <button className="btn btn-ghost" onClick={download}><Icon name="download" size={16} /> Export backup</button>
            <button className="btn btn-ghost" onClick={() => file.current?.click()}><Icon name="upload" size={16} /> Import backup</button>
            <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => onFile(e.target.files?.[0])} />
          </div>
          <div className="btn-row" style={{ marginTop: 10 }}>
            {mode === 'demo'
              ? <button className="btn btn-ink" onClick={() => { switchMode('real'); toast('Back to your own data.'); }}>Exit demo mode</button>
              : <button className="btn btn-ghost" onClick={() => { switchMode('demo'); toast('Demo mode: sample data loaded.'); }}>Explore demo</button>}
            <button className="btn btn-ghost" onClick={() => { setOnboarded(false); }}>Replay intro</button>
            <button className="btn btn-ghost" style={{ color: 'var(--danger)' }} onClick={() => { if (confirm('Delete all tasks, sessions and progress on this device? This cannot be undone.')) { clearAll(); toast('All local data cleared.'); } }}>
              <Icon name="trash" size={16} /> Clear data
            </button>
          </div>
        </section>
      </div>
    </>
  );
}
