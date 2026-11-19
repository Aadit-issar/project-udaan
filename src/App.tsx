import { useEffect } from 'react';
import { HelpMeStart } from './components/HelpMeStart';
import { Icon, Mark } from './components/Icon';
import { store, switchMode, useMode, useUdaan } from './domain/store';
import { Dashboard } from './pages/Dashboard';
import { Focus } from './pages/Focus';
import { Onboarding } from './pages/Onboarding';
import { Planner } from './pages/Planner';
import { Settings } from './pages/Settings';
import { World } from './pages/World';
import { href, useRoute, type Route } from './router';
import { dismissToast, useUi } from './ui';

const NAV: { route: Route; label: string; icon: string }[] = [
  { route: 'home', label: 'Today', icon: 'home' },
  { route: 'plan', label: 'Planner', icon: 'plan' },
  { route: 'focus', label: 'Focus Room', icon: 'focus' },
  { route: 'world', label: 'Skyworld', icon: 'world' },
  { route: 'settings', label: 'Settings', icon: 'settings' },
];

const TITLES: Record<Route, string> = { home: 'Today', plan: 'Planner', focus: 'Focus Room', world: 'Progress World', settings: 'Settings' };

export function App() {
  const s = useUdaan();
  const mode = useMode();
  const { route } = useRoute();
  const ui = useUi();

  useEffect(() => {
    document.title = `${TITLES[route]} · UDAAN`;
    document.getElementById('main')?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [route]);

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', s.settings.reducedMotion);
  }, [s.settings.reducedMotion]);

  if (!s.onboarded && mode === 'real') return <Onboarding />;

  const page = { home: <Dashboard />, plan: <Planner />, focus: <Focus />, world: <World />, settings: <Settings /> }[route];
  const err = store.error();

  return (
    <div className="shell">
      <a className="sr-only" href="#main">Skip to content</a>
      <nav className="rail" aria-label="Main">
        <a className="brand" href={href('home')}>
          <Mark size={34} />
          <span><b>UDAAN</b><small>Drop the scroll, ace the goal.</small></span>
        </a>
        <div className="nav">
          {NAV.map((n) => (
            <a key={n.route} href={href(n.route)} aria-current={route === n.route ? 'page' : undefined}>
              <Icon name={n.icon} size={20} /> {n.label}
            </a>
          ))}
        </div>
        <div className="rail-foot">
          {mode === 'demo' && (
            <p className="demo-flag" style={{ marginBottom: 10 }}>Demo data <button onClick={() => switchMode('real')}>Exit</button></p>
          )}
          Stored on this device · works offline
        </div>
      </nav>

      <main id="main" tabIndex={-1} style={{ outline: 'none' }}>
        <div className="mobile-brand">
          <Mark size={28} /> UDAAN
          {mode === 'demo' && <span className="demo-flag" style={{ marginLeft: 'auto' }}>Demo <button onClick={() => switchMode('real')}>Exit</button></span>}
        </div>
        {err && <p role="alert" className="card" style={{ marginBottom: 16, borderColor: 'var(--danger)' }}>{err}</p>}
        {page}
      </main>

      <nav className="tabbar" aria-label="Main">
        {NAV.map((n) => (
          <a key={n.route} href={href(n.route)} aria-current={route === n.route ? 'page' : undefined}>
            <Icon name={n.icon} size={20} /> {n.label === 'Focus Room' ? 'Focus' : n.label}
          </a>
        ))}
      </nav>

      {ui.helpOpen && <HelpMeStart />}
      {ui.toast && (
        <div className="toast" role="status" aria-live="polite">
          <span>{ui.toast.msg}</span>
          {ui.toast.action && <button className="btn btn-primary btn-sm" onClick={() => { ui.toast!.action!.run(); dismissToast(); }}>{ui.toast.action.label}</button>}
          <button className="icon-btn" aria-label="Dismiss" onClick={dismissToast} style={{ color: '#aab1d3', width: 32, height: 32 }}><Icon name="x" size={16} /></button>
        </div>
      )}
    </div>
  );
}
