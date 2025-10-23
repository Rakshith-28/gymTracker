import { useRef, useState, useEffect } from 'react';

// Realistic muscle anatomy visualization (front/back) using a detailed inline SVG.
// Each muscle group is a separate <path> with an id and click handler.
// Styling follows a cyan wireframe look: stroke="#00d9ff" and fill="rgba(0, 217, 255, 0.1)".
export default function MuscleMap({ selected, onSelect }) {
  const [view, setView] = useState('front');
  const containerRef = useRef(null);

  // Allow drag left/right to flip views
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let downX = null;
    const onDown = (e) => { downX = e.clientX ?? e.touches?.[0]?.clientX ?? null; };
    const onUp = (e) => {
      const upX = e.clientX ?? e.changedTouches?.[0]?.clientX ?? null;
      if (downX != null && upX != null) {
        if (upX - downX > 50) setView('front');
        else if (downX - upX > 50) setView('back');
      }
      downX = null;
    };
    el.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    el.addEventListener('touchstart', onDown, { passive: true });
    window.addEventListener('touchend', onUp);
    return () => {
      el.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
      el.removeEventListener('touchstart', onDown);
      window.removeEventListener('touchend', onUp);
    };
  }, []);

  const groups = view === 'front' ? FRONT_GROUPS : BACK_GROUPS;

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: 520, borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)', background: 'linear-gradient(180deg, rgba(4,8,24,0.9), rgba(2,6,20,0.9))' }}>
      <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 8 }}>
        <button onClick={() => setView(v => v === 'front' ? 'back' : 'front')} style={chip('#0ea5e9')}>↻ Rotate</button>
        <span style={{ ...chip('rgba(255,255,255,0.08)'), cursor: 'default' }}>{view === 'front' ? 'Front' : 'Back'} view</span>
      </div>

      <svg viewBox="0 0 260 520" width="100%" height="100%" style={{ display: 'block' }}>
        <defs>
          {/* Subtle silhouette + fiber lines pattern */}
          <linearGradient id="silhouette" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0b1026"/>
            <stop offset="50%" stopColor="#0a0f24"/>
            <stop offset="100%" stopColor="#080d20"/>
          </linearGradient>
          <pattern id="fibers" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(22)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="#00d9ff22" strokeWidth="1" />
          </pattern>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#00d9ff" floodOpacity="0.6"/>
          </filter>
        </defs>

        {/* Human silhouette (front/back shared) */}
        <g>
          {/* head */}
          <path d="M130 28c-12 0-22 10-22 22s10 22 22 22 22-10 22-22-10-22-22-22z" fill="#0d1430" stroke="#0f1a3a"/>
          {/* neck */}
          <path d="M118 72c0 10 6 14 12 14s12-4 12-14" fill="#0d1430" stroke="#0f1a3a"/>
          {/* torso outline (rib cage to pelvis) */}
          <path d="M88 86c-6 8-10 24-14 40-8 34-14 82-14 110 0 20-10 42-14 66-3 18 6 30 24 36l28 10v38h68v-38l28-10c18-6 27-18 24-36-4-24-14-46-14-66 0-28-6-76-14-110-4-16-8-32-14-40-8-10-24-18-44-18s-36 8-44 18z" fill="url(#silhouette)" stroke="#122041"/>
          {/* legs support */}
          <path d="M98 348c-2 28-2 44-6 64l-10 50h34v-80m28-34c2 28 2 44 6 64l10 50h-34v-80" fill="#0b132b" stroke="#122041"/>
        </g>

        {/* Clickable muscle groups */}
        {groups.map(g => (
          <path
            id={g.key}
            key={g.key}
            d={g.d}
            onClick={() => onSelect?.(g.key)}
            fill={selected === g.key ? 'rgba(0, 217, 255, 0.28)' : 'rgba(0, 217, 255, 0.10)'}
            stroke="#00d9ff"
            strokeWidth={selected === g.key ? 2 : 1.2}
            style={{ cursor: 'pointer', transition: 'filter 140ms ease, opacity 140ms ease' }}
            filter={selected === g.key ? 'url(#glow)' : 'none'}
            onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.2)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.filter = selected === g.key ? 'url(#glow)' : 'none'; }}
          />
        ))}

        {/* optional fiber overlay on selection */}
        {groups.map(g => (
          selected === g.key ? (
            <path key={`${g.key}-fibers`} d={g.d} fill="url(#fibers)" opacity="0.4" pointerEvents="none" />
          ) : null
        ))}
      </svg>

      {/* Legend */}
      <div style={{ position: 'absolute', bottom: 12, left: 12, right: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {groups.map(g => (
          <span
            key={g.key}
            onClick={() => onSelect?.(g.key)}
            style={{ ...chip(selected === g.key ? 'rgba(0, 217, 255, 0.28)' : 'rgba(255,255,255,0.06)'), border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer' }}
          >
            {g.label}
          </span>
        ))}
      </div>
    </div>
  );
}

const chip = (bg) => ({
  padding: '6px 10px', borderRadius: 9999, background: bg, color: '#e8ecff', fontWeight: 700, border: '1px solid rgba(255,255,255,0.12)'
});

// Front view groups: more realistic, individually shaped regions
const FRONT_GROUPS = [
  // Deltoids
  {
    key: 'shoulders', label: 'Deltoids',
    d: `M66 92c-6 2-12 8-14 14-2 6-2 12 4 16 6 4 16 4 22-2 4-4 6-12 6-18-6-6-12-10-18-10z
    M200 92c6 2 12 8 14 14 2 6 2 12-4 16-6 4-16 4-22-2-4-4-6-12-6-18 6-6 12-10 18-10z`
  },
  // Chest (pectorals)
  {
    key: 'chest', label: 'Chest',
    d: `M111 112c-8 2-14 8-16 18-2 10-2 18 6 22 18 8 44 8 62 0 8-4 8-12 6-22-2-10-8-16-16-18-14-2-28-2-42 0z`
  },
  // Biceps (front)
  {
    key: 'biceps', label: 'Biceps',
    d: `M74 146c-6 12-6 36-2 52 2 10 10 16 18 12 8-6 12-20 12-36 0-14-4-26-12-32-6-2-10 0-16 4z
        M186 146c6 12 6 36 2 52-2 10-10 16-18 12-8-6-12-20-12-36 0-14 4-26 12-32 6-2 10 0 16 4z`
  },
  // Triceps (front)
  {
    key: 'triceps', label: 'Triceps',
    d: `M60 146c-8 18-8 46-2 60 4 10 12 14 20 8 8-6 12-22 12-38 0-16-4-28-12-36-6-2-12 0-18 6z
        M200 146c8 18 8 46 2 60-4 10-12 14-20 8-8-6-12-22-12-38 0-16 4-28 12-36 6-2 12 0 18 6z`
  },
  // Abs (rectus abdominis)
  {
    key: 'core', label: 'Abs',
    d: `M118 154c-6 2-10 8-12 18-2 14-2 30 0 44 2 10 6 16 12 18 8 2 16 2 24 0 6-2 10-8 12-18 2-14 2-30 0-44-2-10-6-16-12-18-8-2-16-2-24 0z`
  },
  // Obliques
  {
    key: 'obliques', label: 'Obliques',
    d: `M88 156c-8 10-14 24-16 40-2 10-2 20 0 26 6-2 12-8 16-14 4-8 6-22 6-34 0-6 0-12-6-18z
        M172 156c8 10 14 24 16 40 2 10 2 20 0 26-6-2-12-8-16-14-4-8-6-22-6-34 0-6 0-12 6-18z`
  },
  // Quads
  {
    key: 'quads', label: 'Quads',
    d: `M100 240c-8 0-12 2-14 8-4 16-6 40-6 62 0 10 4 18 10 22l16 10c6-22 10-50 8-78-2-8-6-16-14-24z
        M160 240c8 0 12 2 14 8 4 16 6 40 6 62 0 10-4 18-10 22l-16 10c-6-22-10-50-8-78 2-8 6-16 14-24z`
  },
  // Calves (front)
  {
    key: 'calves', label: 'Calves',
    d: `M96 352c-4 8-6 18-8 26-2 10-2 20 0 28l18 0c2-10 2-20 0-30-2-8-4-16-10-24z
        M164 352c4 8 6 18 8 26 2 10 2 20 0 28l-18 0c-2-10-2-20 0-30 2-8 4-16 10-24z`
  },
];

// Back view groups
const BACK_GROUPS = [
  // Trapezius + upper back
  {
    key: 'back', label: 'Upper Back',
    d: `M107 112c-10 4-18 10-22 18-2 6-2 12 2 16 18 10 74 10 92 0 4-4 4-10 2-16-4-8-12-14-22-18-16-2-36-2-52 0z`
  },
  // Deltoids (rear)
  {
    key: 'shoulders', label: 'Rear Delts',
    d: `M65 114c-8 4-14 10-16 16-2 6 0 12 6 16 8 4 16 2 22-4 4-6 6-12 4-18-6-6-8-8-16-10z
        M200 114c8 4 14 10 16 16 2 6 0 12-6 16-8 4-16 2-22-4-4-6-6-12-4-18 6-6 8-8 16-10z`
  },
  // Biceps (rear, smaller region)
  {
    key: 'biceps', label: 'Biceps',
    d: `M78 148c-4 12-4 28 0 38 4 8 8 10 14 6 6-6 8-18 8-30 0-10-2-18-8-26-6-2-10 0-14 12z
        M182 148c4 12 4 28 0 38-4 8-8 10-14 6-6-6-8-18-8-30 0-10 2-18 8-26 6-2 10 0 14 12z`
  },
  // Triceps (rear)
  {
    key: 'triceps', label: 'Triceps',
    d: `M60 148c-8 18-8 48 0 62 6 10 16 12 22 0 6-12 8-28 8-42 0-14-2-24-8-34-6-2-14 2-22 14z
        M200 148c8 18 8 48 0 62-6 10-16 12-22 0-6-12-8-28-8-42 0-14 2-24 8-34 6-2 14 2 22 14z`
  },
  // Lats
  {
    key: 'lats', label: 'Lats',
    d: `M88 144c-6 10-10 24-12 42-2 12-2 24 2 30 6 8 18 10 34 8-4-10-6-20-6-32 0-18 4-34 10-48-10 0-20 0-28 0z
        M180 144c6 10 10 24 12 42 2 12 2 24-2 30-6 8-18 10-34 8 4-10 6-20 6-32 0-18-4-34-10-48 10 0 20 0 28 0z`
  },
  // Glutes
  {
    key: 'glutes', label: 'Glutes',
    d: `M104 216c-10 2-18 8-20 18-2 10 2 18 10 22 18 10 54 10 72 0 8-4 12-12 10-22-2-10-10-16-20-18-16-2-36-2-52 0z`
  },
  // Hamstrings
  {
    key: 'hamstrings', label: 'Hamstrings',
    d: `M106 246c-8 2-12 10-14 20-4 24-6 48-6 66 0 10 4 18 10 22l14 10c6-20 8-52 8-86 0-12-6-26-12-32z
        M154 246c8 2 12 10 14 20 4 24 6 48 6 66 0 10-4 18-10 22l-14 10c-6-20-8-52-8-86 0-12 6-26 12-32z`
  },
  // Calves (rear)
  {
    key: 'calves', label: 'Calves',
    d: `M100 360c-6 10-8 22-10 32-2 10-2 20 0 28l18 0c2-10 2-20 0-28-2-8-2-20-8-32z
        M160 360c6 10 8 22 10 32 2 10 2 20 0 28l-18 0c-2-10-2-20 0-28 2-8 2-20 8-32z`
  },
];
