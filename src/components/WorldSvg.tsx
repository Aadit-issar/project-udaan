/** Lightweight 2D Skyworld — same levels as the 3D world, zero WebGL cost. */
export function WorldSvg({ level, title = 'Your Skyworld' }: { level: number; title?: string }) {
  const grass = level >= 1;
  return (
    <svg className="world-svg" viewBox="0 0 400 240" role="img" aria-label={`${title}: level ${level}`}>
      <defs>
        <linearGradient id="ws-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0d1531" />
          <stop offset="0.6" stopColor="#2c3566" />
          <stop offset="1" stopColor="#f39a5c" />
        </linearGradient>
        <radialGradient id="ws-sun" cx="0.72" cy="1" r="0.55">
          <stop offset="0" stopColor="#ffc68a" stopOpacity="0.9" />
          <stop offset="1" stopColor="#ffc68a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="240" fill="url(#ws-sky)" />
      <rect width="400" height="240" fill="url(#ws-sun)" />
      <g fill="#f7dccb" opacity="0.85">
        <ellipse cx="60" cy="226" rx="80" ry="16" />
        <ellipse cx="220" cy="232" rx="120" ry="14" />
        <ellipse cx="360" cy="224" rx="70" ry="14" />
      </g>
      {/* home isle */}
      <path d="M110 128 L290 128 L250 150 L215 196 L190 206 L170 180 L140 152 Z" fill="#39436e" />
      <path d="M110 128 L290 128 L272 138 L128 138 Z" fill="#262f55" opacity="0.6" />
      <ellipse cx="200" cy="127" rx="92" ry="12" fill={grass ? '#86b47f' : '#e8dcc4'} />
      {level >= 1 && (
        <g>
          <rect x="246" y="104" width="3" height="18" fill="#7a5236" />
          <circle cx="247.5" cy="102" r="9" fill="#3f8a6a" />
        </g>
      )}
      {level >= 2 && (
        <g>
          {[[130, '#3f8a6a'], [148, '#5f9a6e'], [164, '#c9a253']].map(([x, c]) => (
            <g key={x as number}>
              <rect x={(x as number) - 1.5} y="106" width="3" height="16" fill="#7a5236" />
              <path d={`M${x} 82 L${(x as number) + 10} 110 L${(x as number) - 10} 110 Z`} fill={c as string} />
            </g>
          ))}
        </g>
      )}
      {level >= 3 && (
        <g>
          {[186, 206, 226].map((x) => (
            <g key={x}>
              <rect x={x} y="108" width="2" height="16" fill="#111a35" />
              <circle cx={x + 1} cy="106" r="3.5" fill="#ffc070" />
            </g>
          ))}
        </g>
      )}
      {level >= 4 && (
        <g>
          <path d="M300 104 L360 104 L346 116 L330 140 L316 120 Z" fill="#39436e" />
          <ellipse cx="330" cy="104" rx="31" ry="6" fill="#86b47f" />
          <path d="M282 124 Q296 118 304 106" stroke="#c49a6c" strokeWidth="3" fill="none" strokeDasharray="4 2" />
        </g>
      )}
      {level >= 5 && (
        <g>
          <path d="M325 102 L335 102 L333 76 L327 76 Z" fill="#f6f1e7" />
          <g stroke="#f08a24" strokeWidth="3">
            <line x1="330" y1="78" x2="330" y2="60" /><line x1="330" y1="78" x2="346" y2="80" />
            <line x1="330" y1="78" x2="330" y2="94" /><line x1="330" y1="78" x2="314" y2="76" />
          </g>
        </g>
      )}
      {level >= 6 && (
        <g>
          <path d="M40 92 L84 92 L72 102 L60 118 L50 102 Z" fill="#39436e" />
          <ellipse cx="62" cy="92" rx="22" ry="4" fill="#e8dcc4" />
          <path d="M57 90 L67 90 L65 56 L59 56 Z" fill="#f6f1e7" />
          <rect x="58" y="66" width="8" height="6" fill="#f08a24" />
          <circle cx="62" cy="54" r="4" fill="#ffd39a" />
        </g>
      )}
      {level >= 7 && (
        <g fill="#fffaf0">
          <path d="M150 50 l16 4 l-16 4 l4 -4 z" />
          <path d="M250 36 l14 3 l-14 3 l3 -3 z" />
          <path d="M300 60 l12 3 l-12 3 l3 -3 z" />
        </g>
      )}
    </svg>
  );
}
