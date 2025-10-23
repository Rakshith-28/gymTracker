import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import styles from './WorkoutHistory.module.css';

function WorkoutHistory() {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // all | strength | cardio | flexibility | mixed
  const [sortBy, setSortBy] = useState('recent'); // recent | duration | volume | rating
  const [view, setView] = useState('grid'); // grid | list | timeline
  // Removed manual date range inputs per request
  const [selected, setSelected] = useState({}); // id -> boolean (kept for export fallback, no UI)
  const [visibleCount, setVisibleCount] = useState(12);
  const [toast, setToast] = useState(null); // {message, actionLabel, onAction}

  const navigate = useNavigate();

  const coerceDate = (obj) => obj?.date || obj?.endTime || obj?.startTime || obj?.createdAt || obj?.updatedAt || new Date().toISOString();
  const mapWorkout = (w) => ({
    ...w,
    _source: 'workout',
    date: coerceDate(w),
    exercises: w.exercises || [],
    notes: w.notes || '',
  });
  const mapSession = (s) => ({
    ...s,
    _source: 'session',
    date: coerceDate(s),
    duration: s.duration || (s.endTime && s.startTime ? Math.round((new Date(s.endTime) - new Date(s.startTime)) / 60000) : undefined),
    exercises: s.exercises || [],
    notes: s.notes || '',
  });

  const fetchWorkouts = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const [workoutsRes, sessionsRes] = await Promise.allSettled([
        axios.get('http://localhost:5000/api/workouts', { headers }),
        axios.get('http://localhost:5000/api/sessions', { headers })
      ]);
      const list = [];
      if (workoutsRes.status === 'fulfilled' && Array.isArray(workoutsRes.value?.data)) {
        list.push(...workoutsRes.value.data.map(mapWorkout));
      }
      if (sessionsRes.status === 'fulfilled' && Array.isArray(sessionsRes.value?.data)) {
        list.push(...sessionsRes.value.data.map(mapSession));
      }
      list.sort((a, b) => new Date(b.date) - new Date(a.date));
      setWorkouts(list);
    } catch (err) {
      console.error('Error fetching workouts/sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkouts();
  }, []);

  // Helpers
  const formatDateTime = (d) => {
    const date = new Date(d);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' • ' + date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  };
  

  const countSets = (workout) => workout.exercises?.reduce((s, e) => s + (e.sets?.length || 0), 0) || 0;
  const countExercises = (workout) => workout.exercises?.length || 0;
  const volumeOf = (workout) => workout.exercises?.reduce((sum, e) => sum + (e.sets || []).reduce((s, st) => s + ((st.weight || 0) * (st.reps || 0)), 0), 0) || 0;

  const inferGroups = (workout) => {
    const groups = new Set();
    (workout.exercises || []).forEach(ex => {
      const name = (ex.name || '').toLowerCase();
      if (/(bench|chest|push)/.test(name)) groups.add('chest');
      else if (/(pull|row|back)/.test(name)) groups.add('back');
      else if (/(squat|leg|lunge)/.test(name)) groups.add('legs');
      else if (/(shoulder|press|raise)/.test(name)) groups.add('shoulders');
      else if (/(curl|tricep|arm)/.test(name)) groups.add('arms');
      else if (/(plank|crunch|core)/.test(name)) groups.add('core');
      else if (/(run|cardio|bike|tread|elliptical)/.test(name)) groups.add('cardio');
    });
    return Array.from(groups);
  };

  const inferType = (workout) => {
    const g = inferGroups(workout);
    if (g.includes('cardio') && g.length === 1) return 'cardio';
    if (g.length === 0) return 'mixed';
    const hasStrength = volumeOf(workout) > 0;
    if (hasStrength && g.length > 1) return 'mixed';
    if (hasStrength) return 'strength';
    return 'flexibility';
  };

  const ratingOf = (workout, maxVolPerMin) => {
    const vol = volumeOf(workout);
    const duration = workout.duration || 0;
    const perMin = duration ? vol / duration : vol / 60;
    const ratio = maxVolPerMin ? perMin / maxVolPerMin : 0;
    return Math.max(1, Math.min(5, Math.round(1 + ratio * 4)));
  };

  const filteredSorted = useMemo(() => {
    let list = [...workouts];
    // Filters
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(w =>
        w.notes?.toLowerCase().includes(q) ||
        (w.exercises || []).some(e => (e.name || '').toLowerCase().includes(q))
      );
    }
    if (typeFilter !== 'all') {
      list = list.filter(w => inferType(w) === typeFilter);
    }
    // Sort
    const maxVolPerMin = Math.max(1, ...list.map(w => {
      const vol = volumeOf(w);
      const d = w.duration || 0;
      return d ? vol / d : vol / 60;
    }));
    list.sort((a, b) => {
      if (sortBy === 'recent') return new Date(b.date) - new Date(a.date);
      if (sortBy === 'duration') return (b.duration || 0) - (a.duration || 0);
      if (sortBy === 'volume') return volumeOf(b) - volumeOf(a);
      if (sortBy === 'rating') return ratingOf(b, maxVolPerMin) - ratingOf(a, maxVolPerMin);
      return 0;
    });
    return { list, maxVolPerMin };
  }, [workouts, query, typeFilter, sortBy]);

  const visible = filteredSorted.list.slice(0, visibleCount);

  const handleDelete = async (workout) => {
    if (!window.confirm('Are you sure you want to delete this workout? You can undo within 5 seconds.')) {
      return;
    }
    const token = localStorage.getItem('token');
    // Immediate UI removal
    setWorkouts(prev => prev.filter(w => w._id !== workout._id));
    // Show toast with undo
    setToast({
      message: 'Workout deleted',
      actionLabel: 'Undo',
      onAction: async () => {
        try {
          await axios.post('http://localhost:5000/api/workouts', {
            exercises: workout.exercises,
            notes: workout.notes,
            duration: workout.duration,
            date: workout.date
          }, { headers: { Authorization: `Bearer ${token}` } });
          fetchWorkouts();
        } catch (e) {
          console.error('Failed to undo delete', e);
        }
      }
    });
    // Auto dismiss toast after 5 seconds
    setTimeout(() => setToast(null), 5000);
    try {
      const base = workout._source === 'session' ? 'http://localhost:5000/api/sessions' : 'http://localhost:5000/api/workouts';
      await axios.delete(`${base}/${workout._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      console.error('Error deleting workout:', err);
      setToast({ message: 'Failed to delete workout' });
      fetchWorkouts();
    }
  };

  const handleEdit = (workoutId) => navigate(`/edit-workout/${workoutId}`);

  const handleDuplicate = async (workout) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:5000/api/workouts', {
        exercises: workout.exercises,
        notes: workout.notes,
        duration: workout.duration
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setToast({ message: 'Workout duplicated successfully' });
      fetchWorkouts();
    } catch (err) {
      console.error('Duplicate failed', err);
      setToast({ message: 'Failed to duplicate workout' });
    }
  };

  const toggleSelected = (id) => setSelected(s => ({ ...s, [id]: !s[id] }));

  const exportCSV = () => {
    const rows = [['Date', 'Duration(min)', 'Exercises', 'Sets', 'Volume']];
    const picks = filteredSorted.list.filter(w => selected[w._id]);
    (picks.length ? picks : filteredSorted.list).forEach(w => {
      rows.push([
        new Date(w.date).toISOString(),
        w.duration || 0,
        countExercises(w),
        countSets(w),
        volumeOf(w)
      ]);
    });
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'workouts.csv'; a.click(); URL.revokeObjectURL(url);
  };

  // Derived stats
  const thisMonthCount = useMemo(() => {
    const now = new Date();
    return workouts.filter(w => {
      const d = new Date(w.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
  }, [workouts]);

  const currentStreak = useMemo(() => {
    if (!workouts.length) return 0;
    const days = new Set(workouts.map(w => new Date(w.date).toDateString()));
    let streak = 0;
    const today = new Date();
    for (let i = 0; ; i++) {
      const d = new Date(); d.setDate(today.getDate() - i);
      if (days.has(d.toDateString())) streak++; else break;
    }
    return streak;
  }, [workouts]);

  // Loading skeletons
  if (loading) {
    return (
      <div style={{ maxWidth: '1280px', margin: '40px auto', padding: 20 }}>
        <TopBar
          query={query} setQuery={setQuery}
          typeFilter={typeFilter} setTypeFilter={setTypeFilter}
          sortBy={sortBy} setSortBy={setSortBy}
          view={view} setView={setView}
          thisMonthCount={thisMonthCount}
          streak={currentStreak}
          onExport={exportCSV}
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, marginTop: 16 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ height: 220, borderRadius: 12, background: 'linear-gradient(180deg,#f5f5f5,#fafafa)', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (filteredSorted.list.length === 0) {
    return (
      <div style={{ maxWidth: '900px', margin: '80px auto', padding: 20, textAlign: 'center' }}>
        <h2 style={{ fontWeight: 800, marginBottom: 8 }}>No workouts found</h2>
        <p style={{ opacity: 0.8 }}>Try adjusting your filters or date range. Every day is a chance to get stronger 💪</p>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px) 0 0/22px 22px, linear-gradient(180deg,#0a0e27,#1a1a2e)'
    }}>
      <div className={styles.pageContainer}>
      <TopBar
        query={query} setQuery={setQuery}
        typeFilter={typeFilter} setTypeFilter={setTypeFilter}
        sortBy={sortBy} setSortBy={setSortBy}
        view={view} setView={setView}
        thisMonthCount={thisMonthCount}
        streak={currentStreak}
        onExport={exportCSV}
      />

      {view === 'timeline' ? (
        <TimelineView
          workouts={visible}
          formatDateTime={formatDateTime}
          countExercises={countExercises}
          countSets={countSets}
          volumeOf={volumeOf}
          inferGroups={inferGroups}
          onDelete={handleDelete}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: view === 'grid' ? 'repeat(auto-fit, minmax(320px, 1fr))' : '1fr', gap: 24, marginTop: 16 }}>
          {visible.map(w => (
            <WorkoutCard
              key={w._id}
              workout={w}
              formatDateTime={formatDateTime}
              type={inferType(w)}
              groups={inferGroups(w)}
              exercisesCount={countExercises(w)}
              setsCount={countSets(w)}
              volume={volumeOf(w)}
              rating={ratingOf(w, filteredSorted.maxVolPerMin)}
              onDelete={() => handleDelete(w)}
            />
          ))}
        </div>
      )}

      {visible.length < filteredSorted.list.length && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
          <button onClick={() => setVisibleCount(c => c + 12)} style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: '#e8ecff', cursor: 'pointer' }}>Load more</button>
        </div>
      )}

      {toast && (
        <div style={{ position: 'fixed', left: '50%', bottom: 24, transform: 'translateX(-50%)', background: '#111827', color: 'white', padding: '10px 14px', borderRadius: 9999, display: 'flex', gap: 10, alignItems: 'center', boxShadow: '0 10px 20px rgba(0,0,0,0.2)' }}>
          <span>{toast.message}</span>
          {toast.actionLabel && toast.onAction && (
            <button onClick={() => { toast.onAction(); setToast(null); }} style={{ background: 'transparent', color: '#60a5fa', border: 'none', cursor: 'pointer', fontWeight: 700 }}>{toast.actionLabel}</button>
          )}
          <button onClick={() => setToast(null)} style={{ background: 'transparent', color: '#9ca3af', border: 'none', cursor: 'pointer' }}>✕</button>
        </div>
      )}
      </div>
    </div>
  );
}

function TopBar({ query, setQuery, typeFilter, setTypeFilter, sortBy, setSortBy, view, setView, thisMonthCount, streak, onExport }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className={styles.stickyTopBar}>
      <div style={{
        position: 'relative',
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 12,
        padding: '32px 24px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
        backdropFilter: 'blur(8px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0, color: '#f4f7ff', flex: 1 }}>Workout History</h1>
          <button
            onClick={() => setMenuOpen(o => !o)}
            aria-label="More options"
            style={{
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.06)',
              borderRadius: 8,
              padding: '8px 10px',
              cursor: 'pointer'
            }}
          >⋮</button>
          {menuOpen && (
            <div style={{ position: 'absolute', right: 16, top: 56, background: 'rgba(10,16,40,0.98)', color: '#e8ecff', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, boxShadow: '0 30px 60px rgba(0,0,0,0.5)', width: 220, overflow: 'hidden' }}>
              <MenuItem onClick={() => { setView('grid'); setMenuOpen(false); }}>🔲 Grid View</MenuItem>
              <MenuItem onClick={() => { setView('list'); setMenuOpen(false); }}>📋 List View</MenuItem>
              <MenuItem onClick={() => { setView('timeline'); setMenuOpen(false); }}>📅 Timeline View</MenuItem>
              <div style={{ height: 1, background: '#f3f4f6' }} />
              <MenuItem onClick={() => { onExport(); setMenuOpen(false); }}>📥 Export CSV</MenuItem>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flex: 1 }}>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by exercise, notes..." style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: '#e8ecff' }} />
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: '#e8ecff' }}>
              <option value="all">All types</option>
              <option value="strength">Strength</option>
              <option value="cardio">Cardio</option>
              <option value="flexibility">Flexibility</option>
              <option value="mixed">Mixed</option>
            </select>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: '#e8ecff' }}>
              <option value="recent">Recent</option>
              <option value="duration">Duration</option>
              <option value="volume">Volume</option>
              <option value="rating">Rating</option>
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 14 }}>
          <Chip>📆 {thisMonthCount} workouts this month</Chip>
          <Chip>🔥 {streak}-day streak</Chip>
        </div>
      </div>
    </div>
  );
}

function MenuItem({ children, onClick }) {
  return (
    <button onClick={onClick} style={{ width: '100%', textAlign: 'left', padding: '10px 14px', background: 'transparent', color: '#e8ecff', border: 'none', cursor: 'pointer' }}>
      {children}
    </button>
  );
}

function Chip({ children }) {
  return (
    <div style={{ padding: '8px 12px', borderRadius: 9999, background: 'rgba(255,255,255,0.08)', color: '#e8ecff', fontWeight: 600, border: '1px solid rgba(255,255,255,0.12)' }}>{children}</div>
  );
}

// Format seconds to mm:ss for per-exercise duration badges
function formatMMSS(seconds) {
  const s = Math.max(0, Number(seconds) || 0);
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function WorkoutCard({ workout, formatDateTime, type, groups, exercisesCount, setsCount, volume, rating, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [hovered, setHovered] = useState(false);
  const typeStyles = getTypeStyles(type);
  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={{
      border: '1px solid rgba(255,255,255,0.12)',
      background: 'rgba(255,255,255,0.06)',
      padding: 24,
      boxShadow: hovered ? '0 18px 40px rgba(0,0,0,0.4)' : '0 8px 20px rgba(0,0,0,0.3)',
      transition: 'transform 160ms ease, box-shadow 160ms ease',
      transform: hovered ? 'translateY(-3px)' : 'none',
      borderRadius: 16,
      color: '#e8ecff',
      backdropFilter: 'blur(4px)'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#cdb9d1ff' }}>{formatDateTime(workout.date)}</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            <Badge label={labelForType(type)} colors={typeStyles} />
            {workout.duration ? <Badge label={`${workout.duration} min`} colors={{ bg: '#e0f2fe', fg: '#075985', border: '#bae6fd' }} /> : null}
            <Badge label="Completed ✓" colors={{ bg: '#abdabbff', fg: '#166534', border: '#bbf7d0' }} />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={onDelete} title="Delete" style={{ ...iconBtnDark, background: 'rgba(220,38,38,0.1)', color: '#fecaca', borderColor: 'rgba(220,38,38,0.35)' }}>🗑️</button>
        </div>
      </div>

      {/* Body */}
      <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 14 }}>
        <KV label="Summary" value={`${exercisesCount} exercises • ${setsCount} sets`} colSpan={6} />
        <KV label="Volume" value={`${volume.toLocaleString()} lbs`} colSpan={3} />
        <KV label="Rating" value={<Stars n={rating} />} colSpan={3} />
        <div style={{ gridColumn: 'span 12', display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
          {groups.map(g => <Tag key={g} text={g} />)}
        </div>
        {workout.notes && (
          <div style={{ gridColumn: 'span 12', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 12, color: '#aab6ff', marginBottom: 4 }}>Notes</div>
            <div style={{ color: '#b7bcd8ff' }}>{workout.notes}</div>
          </div>
        )}
      </div>

      {/* Preview */}
      <div style={{ marginTop: 12 }}>
        <button onClick={() => setExpanded(e => !e)} style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: '#e8ecff', cursor: 'pointer' }}>
          {expanded ? 'Hide Exercises ▲' : 'Show Exercises ▼'}
        </button>
        {expanded && (
          <div style={{ marginTop: 10 }}>
            {(workout.exercises || []).map((ex, idx) => (
              <div key={idx} style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 600, color: '#e8ecff' }}>{ex.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ color: '#c8ccddff', fontSize: 13 }}>
                    {(ex.sets || []).map((s, i) => (
                      <span key={i} style={{ marginLeft: i ? 6 : 0 }}>{s.weight}×{s.reps}</span>
                    ))}
                  </div>
                  {typeof ex.duration === 'number' && (
                    <span style={{ padding: '4px 8px', borderRadius: 9999, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#aab6ff', fontSize: 12 }}>
                      {formatMMSS(ex.duration)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TimelineView({ workouts, formatDateTime, countExercises, countSets, volumeOf, inferGroups, onDelete }) {
  return (
    <div style={{ position: 'relative', marginTop: 8 }}>
      <div style={{ position: 'absolute', left: 16, top: 0, bottom: 0, width: 2, background: 'rgba(255,255,255,0.12)' }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {workouts.map(w => (
          <div key={w._id} style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: 20, background: 'rgba(255,255,255,0.06)', color: '#e8ecff', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>🏋️</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#e8ecff' }}>{formatDateTime(w.date)}</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => onDelete(w)} title="Delete" style={{ ...iconBtnDark, background: 'rgba(220,38,38,0.1)', color: '#fecaca', borderColor: 'rgba(220,38,38,0.35)' }}>🗑️</button>
                </div>
              </div>
              <div style={{ color: '#c9d3ff', marginTop: 2 }}>
                {countExercises(w)} exercises • {countSets(w)} sets • {volumeOf(w).toLocaleString()} lbs volume
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                {inferGroups(w).map(g => <Tag key={g} text={g} />)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function KV({ label, value, colSpan = 3 }) {
  return (
    <div style={{ gridColumn: `span ${colSpan}` }}>
      <div style={{ fontSize: 12, color: '#aab6ff' }}>{label}</div>
      <div style={{ fontWeight: 700, color: '#e8ecff' }}>{value}</div>
    </div>
  );
}

function Badge({ label, colors }) {
  return (
    <span style={{ padding: '6px 12px', borderRadius: 9999, background: colors.bg, color: colors.fg, border: `1px solid ${colors.border}`, fontWeight: 700, fontSize: 12 }}>{label}</span>
  );
}

function Tag({ text }) {
  return (
    <span style={{ padding: '6px 10px', borderRadius: 9999, background: 'rgba(255,255,255,0.08)', color: '#e8ecff', border: '1px solid rgba(255,255,255,0.12)', fontWeight: 700, fontSize: 12, textTransform: 'capitalize' }}>{text}</span>
  );
}

function Stars({ n }) {
  const filled = '★'.repeat(n);
  const empty = '☆'.repeat(5 - n);
  return (
    <span title={`${n}/5`} style={{
      background: 'linear-gradient(180deg,#fbbf24,#f59e0b)',
      WebkitBackgroundClip: 'text',
      backgroundClip: 'text',
      color: 'transparent'
    }}>
      {filled}
      <span style={{ color: '#d1d5db', background: 'none' }}>{empty}</span>
    </span>
  );
}

const iconBtnDark = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '6px 8px', cursor: 'pointer', transition: 'background 120ms ease' };

function getTypeStyles(type) {
  switch (type) {
    case 'strength': return { bg: 'rgba(59,130,246,0.15)', fg: '#93c5fd', border: 'rgba(59,130,246,0.35)' };
    case 'cardio': return { bg: 'rgba(239,68,68,0.15)', fg: '#fecaca', border: 'rgba(239,68,68,0.35)' };
    case 'flexibility': return { bg: 'rgba(34,197,94,0.15)', fg: '#bbf7d0', border: 'rgba(34,197,94,0.35)' };
    default: return { bg: 'rgba(168,85,247,0.15)', fg: '#e9d5ff', border: 'rgba(168,85,247,0.35)' };
  }
}

function labelForType(type) {
  switch (type) {
    case 'strength': return 'Strength';
    case 'cardio': return 'Cardio';
    case 'flexibility': return 'Flexibility';
    default: return 'Mixed';
  }
}

export default WorkoutHistory;