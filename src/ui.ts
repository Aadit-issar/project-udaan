import { useSyncExternalStore } from 'react';

/** Tiny UI-only store for global overlays (Help Me Start, toasts). Not persisted. */
interface UiState {
  helpOpen: boolean;
  toast: { msg: string; action?: { label: string; run: () => void } } | null;
}
let ui: UiState = { helpOpen: false, toast: null };
const subs = new Set<() => void>();
let toastTimer: ReturnType<typeof setTimeout> | undefined;

function set(p: Partial<UiState>) { ui = { ...ui, ...p }; subs.forEach((s) => s()); }

export const useUi = () => useSyncExternalStore((cb) => { subs.add(cb); return () => subs.delete(cb); }, () => ui);
export const openHelp = () => set({ helpOpen: true });
export const closeHelp = () => set({ helpOpen: false });
export function toast(msg: string, action?: { label: string; run: () => void }) {
  clearTimeout(toastTimer);
  set({ toast: { msg, action } });
  toastTimer = setTimeout(() => set({ toast: null }), 5000);
}
export const dismissToast = () => set({ toast: null });
