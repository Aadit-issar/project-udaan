import { useState } from 'react';
import { Icon, Mark } from '../components/Icon';
import { createTask, setOnboarded, switchMode, updateSettings } from '../domain/store';
import { go } from '../router';
import { openHelp } from '../ui';

const NEEDS = [
  { id: 'start', label: 'Starting tasks', icon: 'spark' },
  { id: 'focus', label: 'Staying focused', icon: 'focus' },
  { id: 'deadlines', label: 'Managing deadlines', icon: 'clock' },
  { id: 'consistency', label: 'Building consistency', icon: 'world' },
] as const;

export function Onboarding() {
  const [step, setStep] = useState(0);
  const [needs, setNeeds] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [when, setWhen] = useState<'today' | 'tomorrow' | 'week' | 'none'>('tomorrow');

  const finish = (withTask: boolean) => {
    if (name.trim()) updateSettings({ name: name.trim().slice(0, 40) });
    if (withTask && title.trim()) {
      const d = new Date();
      d.setHours(18, 0, 0, 0);
      if (when === 'tomorrow') d.setDate(d.getDate() + 1);
      if (when === 'week') d.setDate(d.getDate() + 7);
      createTask({ title, subject: '', importance: when === 'today' || when === 'tomorrow' ? 3 : 2, dueAt: when === 'none' ? null : d.toISOString(), estimateMin: 40 }, true);
    }
    setOnboarded(true);
    go('home');
    if (withTask && title.trim()) setTimeout(openHelp, 150);
  };

  return (
    <div className="onboard">
      <div className="panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 36 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Mark size={34} />
            <b style={{ fontFamily: 'var(--display)', letterSpacing: '0.1em', fontSize: '1.2rem' }}>UDAAN</b>
          </div>
          <div className="dots" aria-label={`Step ${step + 1} of 3`}>{[0, 1, 2].map((i) => <i key={i} className={i <= step ? 'on' : ''} />)}</div>
        </div>

        {step === 0 && (
          <section aria-labelledby="ob-1">
            <p className="eyebrow" style={{ color: '#ffc68a' }}>Break the delay, build the day</p>
            <h1 id="ob-1" style={{ marginTop: 10 }}>Drop the scroll, <em>ace the goal.</em></h1>
            <p style={{ color: '#c7cde8', fontSize: '1.08rem', marginTop: 16, maxWidth: 460 }}>
              UDAAN turns big, scary assignments into one small first step — then helps you focus on it. No account. Your data stays on this device.
            </p>
            <div className="btn-row" style={{ marginTop: 32 }}>
              <button className="btn btn-primary btn-lg" onClick={() => setStep(1)}>Get started <Icon name="arrow" size={18} /></button>
              <button className="btn btn-light btn-lg" onClick={() => { switchMode('demo'); go('home'); }}>Explore demo</button>
            </div>
            <p style={{ color: '#98a0c4', fontSize: '0.82rem', marginTop: 14 }}>The demo uses clearly labelled sample data and never touches your own tasks.</p>
          </section>
        )}

        {step === 1 && (
          <section aria-labelledby="ob-2">
            <h1 id="ob-2" style={{ fontSize: 'clamp(2rem, 6vw, 2.8rem)' }}>What do you need help with?</h1>
            <p style={{ color: '#c7cde8', marginTop: 10 }}>Pick any. You can skip this.</p>
            <div style={{ display: 'grid', gap: 10, marginTop: 22 }}>
              {NEEDS.map((n) => (
                <button key={n.id} className="choice" aria-pressed={needs.includes(n.id)} onClick={() => setNeeds((v) => (v.includes(n.id) ? v.filter((x) => x !== n.id) : [...v, n.id]))}>
                  <Icon name={n.icon} size={20} /> {n.label}
                  {needs.includes(n.id) && <span style={{ marginLeft: 'auto', color: '#ffc68a' }}><Icon name="check" size={18} stroke={3} /></span>}
                </button>
              ))}
            </div>
            <div className="field" style={{ marginTop: 18 }}>
              <label htmlFor="ob-name" style={{ color: '#c7cde8' }}>What should we call you? (optional)</label>
              <input id="ob-name" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="Nickname" />
            </div>
            <div className="btn-row" style={{ marginTop: 24 }}>
              <button className="btn btn-primary btn-lg" onClick={() => setStep(2)}>Continue <Icon name="arrow" size={18} /></button>
              <button className="btn btn-light" onClick={() => setStep(0)}>Back</button>
            </div>
          </section>
        )}

        {step === 2 && (
          <form aria-labelledby="ob-3" onSubmit={(e) => { e.preventDefault(); finish(true); }}>
            <h1 id="ob-3" style={{ fontSize: 'clamp(2rem, 6vw, 2.8rem)' }}>What’s one thing on your plate?</h1>
            <p style={{ color: '#c7cde8', marginTop: 10 }}>A real assignment. UDAAN will break it into steps and suggest where to begin.</p>
            <div className="field" style={{ marginTop: 22 }}>
              <label htmlFor="ob-task" style={{ color: '#c7cde8' }}>Task</label>
              <input id="ob-task" className="input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} placeholder="Revise Chemistry Equilibrium" autoFocus />
            </div>
            <div className="field" style={{ marginTop: 14 }}>
              <span className="label" id="ob-when" style={{ color: '#c7cde8' }}>When is it due?</span>
              <div className="seg dark" role="group" aria-labelledby="ob-when" style={{ background: 'rgba(255,255,255,0.08)' }}>
                {(['today', 'tomorrow', 'week', 'none'] as const).map((w) => (
                  <button type="button" key={w} aria-pressed={when === w} onClick={() => setWhen(w)}>{{ today: 'Today', tomorrow: 'Tomorrow', week: 'Next week', none: 'No date' }[w]}</button>
                ))}
              </div>
            </div>
            <div className="btn-row" style={{ marginTop: 26 }}>
              <button className="btn btn-primary btn-lg" disabled={!title.trim()}><Icon name="spark" size={18} /> Help me start</button>
              <button type="button" className="btn btn-light" onClick={() => finish(false)}>Skip for now</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
