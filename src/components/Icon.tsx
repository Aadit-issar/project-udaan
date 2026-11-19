const PATHS: Record<string, string> = {
  home: 'M3 11.5 12 4l9 7.5M5.5 9.5V20h13V9.5',
  plan: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  focus: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-5a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  world: 'M2 14c3-2 6-2 10 0s7 2 10 0M5 14l2.5 5h9L19 14M9 10l3-6 3 6',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 14H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 10 3V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.7 1.7 0 0 0 21 10h0a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z',
  spark: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6',
  glider: 'M2 12 22 4l-6 16-4-7-10-1Zm10 1 10-9',
  check: 'M5 12.5 10 17 19 7',
  plus: 'M12 5v14M5 12h14',
  x: 'M6 6l12 12M18 6 6 18',
  play: 'M7 5v14l12-7L7 5Z',
  pause: 'M8 5v14M16 5v14',
  stop: 'M6 6h12v12H6z',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  pin: 'M9 4h6l-1 6 4 3H6l4-3-1-6Zm3 9v8',
  up: 'M6 15l6-6 6 6',
  down: 'M6 9l6 6 6-6',
  flag: 'M5 21V4M5 4h11l-2 4 2 4H5',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v4l3 2',
  vr: 'M3 8h18v8h-6l-2-3h-2l-2 3H3V8Z',
  cube: 'M12 2 3 7v10l9 5 9-5V7l-9-5Zm0 0v20M3 7l9 5 9-5',
  expand: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
  edit: 'M4 20h4L19 9l-4-4L4 16v4Z',
  download: 'M12 4v11m0 0-4-4m4 4 4-4M4 20h16',
  upload: 'M12 20V9m0 0-4 4m4-4 4 4M4 4h16',
  arrow: 'M5 12h14m-5-5 5 5-5 5',
  wand: 'M15 4V2M15 10V8M11 6H9M21 6h-2M4 20 14 10',
};

export function Icon({ name, size = 20, stroke = 1.8 }: { name: keyof typeof PATHS | string; size?: number; stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name] ?? ''} />
    </svg>
  );
}

/** The UDAAN mark: a paper glider rising along a horizon arc. */
export function Mark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="15" fill="#f08a24" />
      <path d="M4 21c6-1 15-1 24 0" stroke="#111a35" strokeWidth="1.6" fill="none" strokeLinecap="round" opacity=".55" />
      <path d="M8 17 24 9l-5 12-3.4-5.2L8 17Z" fill="#111a35" />
      <path d="M15.6 15.8 24 9" stroke="#f08a24" strokeWidth="1.2" />
    </svg>
  );
}
