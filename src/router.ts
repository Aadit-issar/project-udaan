import { useSyncExternalStore } from 'react';

/** Hash routing — safe on static hosts like GitHub Pages (refresh never 404s). */
export type Route = 'home' | 'plan' | 'focus' | 'world' | 'settings';
const ROUTES: Route[] = ['home', 'plan', 'focus', 'world', 'settings'];

function parse(): { route: Route; param: string | null } {
  const [, r, p] = (location.hash || '#/').split('/');
  const route = (ROUTES.includes(r as Route) ? r : 'home') as Route;
  return { route, param: p ? decodeURIComponent(p) : null };
}

let current = parse();
const subs = new Set<() => void>();
window.addEventListener('hashchange', () => {
  current = parse();
  subs.forEach((s) => s());
  window.scrollTo({ top: 0 });
});

export function useRoute() {
  return useSyncExternalStore((cb) => { subs.add(cb); return () => subs.delete(cb); }, () => current);
}

export function go(route: Route, param?: string) {
  location.hash = `#/${route === 'home' ? '' : route}${param ? `/${encodeURIComponent(param)}` : ''}`;
}

export const href = (route: Route) => `#/${route === 'home' ? '' : route}`;
