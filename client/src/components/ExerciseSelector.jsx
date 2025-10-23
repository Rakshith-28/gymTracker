import { useMemo, useState, useEffect, useRef } from 'react';

// Premium searchable exercise selector grouped by body part
// Props: exercises [{ _id, name, bodyPart }], onSelect(name), placeholder?
export default function ExerciseSelector({ exercises = [], onSelect, placeholder = 'Choose an exercise...' }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [activePart, setActivePart] = useState('All');
  const panelRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    const onClick = (e) => {
      if (!panelRef.current) return;
      if (!panelRef.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const toTitle = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  const norm = (s='') => (s || '').toString().trim().toLowerCase();
  const getPart = (e) => {
    const raw = (e.bodyPart || e.category || 'Other');
    return toTitle(raw);
  };

  // Anatomy parts to always expose as filter chips (aligned with MuscleMap)
  const ANATOMY_PARTS = [
    'Chest', 'Deltoids', 'Arms', 'Abs', 'Obliques',
    'Quads', 'Hamstrings', 'Glutes', 'Calves',
    'Upper Back', 'Lats', 'Rear Delts',
    // Include broad groups for convenience
    'Back', 'Shoulders', 'Core', 'Cardio'
  ];

  const getMuscles = (e) => {
    const base = Array.isArray(e.muscleGroup) ? e.muscleGroup : [];
    const primary = e.primaryMuscle ? [e.primaryMuscle] : [];
    const secondary = Array.isArray(e.secondaryMuscles) ? e.secondaryMuscles : [];
    return Array.from(new Set([...base, ...primary, ...secondary].map(toTitle)));
  };

  // Map chip name to matching predicates against category/bodyPart/muscleGroup
  const partMatchers = {
    'Chest': (e) => norm(getPart(e)) === 'chest' || getMuscles(e).some(m => norm(m) === 'chest' || norm(m) === 'pectorals' || norm(m) === 'pecs'),
    'Deltoids': (e) => norm(getPart(e)) === 'shoulders' || getMuscles(e).some(m => ['deltoids','shoulders','front delts','side delts'].includes(norm(m))),
    'Rear Delts': (e) => getMuscles(e).some(m => ['rear delts','posterior delts','rear deltoids'].includes(norm(m))),
    'Arms': (e) => norm(getPart(e)) === 'arms' || getMuscles(e).some(m => ['biceps','triceps','forearms','arms'].includes(norm(m))),
    'Abs': (e) => norm(getPart(e)) === 'core' || getMuscles(e).some(m => ['abs','rectus abdominis'].includes(norm(m))),
    'Obliques': (e) => norm(getPart(e)) === 'core' || getMuscles(e).some(m => ['obliques'].includes(norm(m))),
    'Quads': (e) => norm(getPart(e)) === 'legs' || getMuscles(e).some(m => ['quads','quadriceps'].includes(norm(m))),
    'Hamstrings': (e) => norm(getPart(e)) === 'legs' || getMuscles(e).some(m => ['hamstrings'].includes(norm(m))),
    'Glutes': (e) => norm(getPart(e)) === 'legs' || getMuscles(e).some(m => ['glutes','gluteus maximus','gluteus medius'].includes(norm(m))),
    'Calves': (e) => norm(getPart(e)) === 'legs' || getMuscles(e).some(m => ['calves','gastrocnemius','soleus'].includes(norm(m))),
    'Upper Back': (e) => norm(getPart(e)) === 'back' || getMuscles(e).some(m => ['upper back','traps','trapezius','rhomboids'].includes(norm(m))),
    'Lats': (e) => norm(getPart(e)) === 'back' || getMuscles(e).some(m => ['lats','latissimus dorsi'].includes(norm(m))),
    'Back': (e) => norm(getPart(e)) === 'back' || getMuscles(e).some(m => ['back','upper back','lower back','lats','traps','rhomboids'].includes(norm(m))),
    'Shoulders': (e) => norm(getPart(e)) === 'shoulders' || getMuscles(e).some(m => ['shoulders','deltoids','front delts','side delts','rear delts'].includes(norm(m))),
    'Core': (e) => norm(getPart(e)) === 'core' || getMuscles(e).some(m => ['core','abs','obliques','lower back'].includes(norm(m))),
    'Cardio': (e) => norm(getPart(e)) === 'cardio' || getMuscles(e).some(m => ['cardio'].includes(norm(m)))
  };

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    let list = exercises;
    // filter by selected part (category or muscle)
    if (activePart && activePart !== 'All') {
      const matcher = partMatchers[activePart] || ((e) => (
        // fallback: match category/bodyPart or any muscleGroup title
        getPart(e).toLowerCase() === activePart.toLowerCase() ||
        getMuscles(e).some(m => m.toLowerCase() === activePart.toLowerCase())
      ));
      list = list.filter(matcher);
    }
    // then apply search if any
    if (query) {
      list = list.filter(e => (
        (e.name || '').toLowerCase().includes(query) ||
        getPart(e).toLowerCase().includes(query) ||
        getMuscles(e).some(m => m.toLowerCase().includes(query))
      ));
    }
    return list;
  }, [exercises, q, activePart]);

  const groups = useMemo(() => {
    const map = new Map();
    filtered.forEach(ex => {
      const key = getPart(ex) || 'Other';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(ex);
    });
    // sort groups by name; items alphabetically
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, list]) => [k, list.sort((a, b) => (a.name || '').localeCompare(b.name || ''))]);
  }, [filtered]);

  // unique body parts for filter chips
  const bodyParts = useMemo(() => {
    const set = new Set();
    // Always include anatomy parts
    ANATOMY_PARTS.forEach(p => set.add(p));
    // Add categories/bodyPart from data
    exercises.forEach(e => set.add(getPart(e)));
    // Add muscles from data
    exercises.forEach(e => getMuscles(e).forEach(m => set.add(toTitle(m))));
    // Remove 'Other'
    set.delete('Other');
    // Stable ordering: our anatomy list first, then alphabeticals of the rest
    const rest = Array.from(set).filter(x => !ANATOMY_PARTS.includes(x)).sort((a, b) => a.localeCompare(b));
    return ['All', ...ANATOMY_PARTS, ...rest].filter((v, i, arr) => arr.indexOf(v) === i);
  }, [exercises]);

  const base = {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 10,
    color: '#e8ecff'
  };

  return (
    <div style={{ position: 'relative' }} ref={panelRef}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ ...base, padding: '12px 14px', width: '100%', textAlign: 'left', cursor: 'pointer' }}
        aria-expanded={open}
      >
        <span style={{ opacity: 0.85 }}>{placeholder}</span>
        <span style={{ float: 'right', opacity: 0.6 }}>▾</span>
      </button>
      {open && (
        <div style={{ position: 'absolute', left: 0, right: 0, top: 'calc(100% + 8px)', zIndex: 20, ...base, boxShadow: '0 30px 60px rgba(0,0,0,0.5)', background: 'rgba(10,16,40,0.98)' }}>
          <div style={{ padding: 10, borderBottom: '1px solid rgba(255,255,255,0.08)', position: 'sticky', top: 0, background: 'rgba(10,16,40,0.98)' }}>
            {/* Body part filter chips */}
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 8 }}>
              {bodyParts.map(part => {
                const active = activePart === part;
                return (
                  <button
                    key={part}
                    onClick={() => setActivePart(part)}
                    aria-pressed={active}
                    style={{
                      padding: '6px 10px',
                      borderRadius: 9999,
                      border: active ? '1px solid #7c3aed' : '1px solid rgba(255,255,255,0.12)',
                      background: active ? 'rgba(124,58,237,0.18)' : 'rgba(255,255,255,0.06)',
                      color: '#e8ecff',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {part}
                  </button>
                );
              })}
            </div>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name or body part..."
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: '#e8ecff' }}
              autoFocus
            />
          </div>
          <div style={{ maxHeight: 320, overflow: 'auto', padding: 8 }}>
            {groups.length === 0 && (
              <div style={{ opacity: 0.7, padding: 12 }}>No matches</div>
            )}
            {groups.map(([group, list]) => (
              <div key={group} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 12, color: '#aab6ff', padding: '6px 8px' }}>{group}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 6 }}>
                  {list.map(item => (
                    <button
                      key={item._id || item.name}
                      onClick={() => { setOpen(false); setQ(''); onSelect?.(item.name); }}
                      style={{
                        textAlign: 'left', padding: '10px 12px', borderRadius: 8,
                        border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', color: '#e8ecff', cursor: 'pointer'
                      }}
                    >
                      <div style={{ fontWeight: 700 }}>{item.name}</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                        {item.primaryMuscle && (
                          <span style={{ padding: '4px 8px', borderRadius: 9999, background: 'rgba(124,58,237,0.25)', border: '1px solid #7c3aed', fontSize: 12, fontWeight: 700 }}>{toTitle(item.primaryMuscle)}</span>
                        )}
                        {Array.isArray(item.secondaryMuscles) && item.secondaryMuscles.map((m, idx) => (
                          <span key={idx} style={{ padding: '3px 7px', borderRadius: 9999, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', fontSize: 11, opacity: 0.9 }}>{toTitle(m)}</span>
                        ))}
                        {/* Fallback to category/bodyPart if no muscles present */}
                        {(!item.primaryMuscle && (!item.secondaryMuscles || item.secondaryMuscles.length === 0)) && (
                          <span style={{ padding: '3px 7px', borderRadius: 9999, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', fontSize: 11 }}>{getPart(item)}</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
