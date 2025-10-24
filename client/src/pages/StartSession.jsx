import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ExerciseSelector from '../components/ExerciseSelector.jsx';
import styles from './StartSession.module.css';
import { useWorkout } from '../context/WorkoutContext.jsx';

function StartSession() {
  const { isSessionActive, start, stop, reset, cancel, setPhase: setGlobalPhase, totalTime, activeTime, restTime, recordExercise } = useWorkout();
  // Keep local trackers for per-exercise timing
  const [sessionId, setSessionId] = useState(null);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  
  const [currentPhase, setCurrentPhase] = useState('idle'); // 'idle', 'exercise', 'rest'
  const [exerciseSeconds, setExerciseSeconds] = useState(0);
  const [restSeconds, setRestSeconds] = useState(0);
  
  const [exercises, setExercises] = useState([]);
  const [exerciseLibrary, setExerciseLibrary] = useState([]);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(-1);
  // Track a global active seconds separate from total seconds (derived but exposed at top)
  // We keep computing it from exercises + current like before, so no extra timers are needed.
  
  const [selectedExercise, setSelectedExercise] = useState('');
  const [currentSets, setCurrentSets] = useState([]);
  const [exerciseNotes, setExerciseNotes] = useState('');
  const [exerciseConfidence, setExerciseConfidence] = useState(3);
  
  const [templates, setTemplates] = useState([]);
  const [sessionNotes, setSessionNotes] = useState('');
  const [sessionFeeling, setSessionFeeling] = useState(3);
  
  const [performanceHistory, setPerformanceHistory] = useState({});
  const [sessionSummary, setSessionSummary] = useState(null);
  // UI state: sidebar and info modal
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [dateTimeStr, setDateTimeStr] = useState('');
  
  const navigate = useNavigate();

  // Fetch exercise library and templates on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        
        const [exercisesRes, templatesRes] = await Promise.all([
          axios.get('http://localhost:5000/api/exercises', { headers }),
          // Templates endpoint may not exist; guard with try/catch fallback
          axios.get('http://localhost:5000/api/templates', { headers }).catch(() => ({ data: [] }))
        ]);
        
        setExerciseLibrary(exercisesRes.data);
        setTemplates(templatesRes.data);
      } catch (err) {
        console.error('Error fetching data:', err);
      }
    };
    fetchData();
  }, []);

  // Rehydrate an active sessionId if present (e.g., after route change or refresh)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('activeSessionId');
      if (saved && !sessionId) {
        setSessionId(saved);
      }
    } catch {}
  }, [sessionId]);

  // Live date + time header (e.g., Thursday, Oct 23 | 9:43 PM)
  useEffect(() => {
    const formatDateTime = () => {
      const now = new Date();
      const day = now.toLocaleDateString(undefined, { weekday: 'long' });
      const date = now.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      const time = now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
      return `${day}, ${date} | ${time}`;
    };
    const update = () => setDateTimeStr(formatDateTime());
    update();
    const id = setInterval(update, 30000);
    return () => clearInterval(id);
  }, []);

  // Keep global phase in sync with page phase
  useEffect(() => {
    setGlobalPhase(currentPhase);
  }, [currentPhase, setGlobalPhase]);

  // If we have an active session, load any saved exercises from the server so resuming shows past work
  useEffect(() => {
    const rehydrateFromServer = async () => {
      try {
        const token = localStorage.getItem('token');
        const saved = localStorage.getItem('activeSessionId');
        if (!isSessionActive || !saved) return;
        // Only fetch if we don't already have exercises in state
        if (exercises && exercises.length > 0) return;
        const res = await axios.get(`http://localhost:5000/api/sessions/${saved}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const sess = res?.data;
        if (sess && Array.isArray(sess.exercises)) {
          setExercises(sess.exercises);
          setSessionId(sess._id || saved);
        }
      } catch (e) {
        // Silent failure; user can continue
        console.warn('Failed to rehydrate session from server', e);
      }
    };
    rehydrateFromServer();
    // Only run once when session becomes active
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSessionActive]);

  // Exercise timer
  useEffect(() => {
    let interval;
    if (currentPhase === 'exercise') {
      interval = setInterval(() => {
        setExerciseSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [currentPhase]);

  // Rest timer
  useEffect(() => {
    let interval;
    if (currentPhase === 'rest') {
      interval = setInterval(() => {
        setRestSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [currentPhase]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startSession = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('http://localhost:5000/api/sessions/start', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
  setSessionId(response.data._id);
      setSessionStartTime(new Date());
      start();
      setCurrentPhase('idle');
  try { localStorage.setItem('activeSessionId', response.data._id); } catch {}
    } catch (err) {
      alert('Failed to start session');
    }
  };

  const handleOpenInfoModal = () => setIsInfoModalOpen(true);
  const handleCancelInfoModal = () => setIsInfoModalOpen(false);
  const handleContinueInfoModal = async () => {
    // Confirm, start session (if not already) and navigate to logging view
    setIsInfoModalOpen(false);
    if (!isSessionActive) {
      await startSession();
    }
    // Route alias for in-progress view
    navigate('/workout-in-progress');
  };

  const selectExercise = async (exerciseName) => {
    // If in rest phase, stop rest timer and save it to the last exercise
    if (currentPhase === 'rest') {
      const restDuration = restSeconds;
      const updatedExercises = [...exercises];
      if (updatedExercises.length > 0) {
        updatedExercises[updatedExercises.length - 1].restAfter = restDuration;
      }
      setExercises(updatedExercises);
      setRestSeconds(0);
    }

  setSelectedExercise(exerciseName);
    setCurrentPhase('exercise');
    setExerciseSeconds(0);
    setCurrentSets([]);
    setExerciseNotes('');
    setExerciseConfidence(3);

    // Fetch performance history from both workouts AND sessions
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [workoutsRes, sessionsRes] = await Promise.all([
        axios.get(`http://localhost:5000/api/workouts/exercise/${exerciseName}`, { headers }).catch(() => ({ data: [] })),
        axios.get('http://localhost:5000/api/sessions', { headers }).catch(() => ({ data: [] }))
      ]);
      
      // Find this exercise in sessions
      const sessionExercises = [];
      sessionsRes.data.forEach(session => {
        const ex = (session.exercises || []).find(e => e.name === exerciseName);
        if (ex) {
          sessionExercises.push({
            date: session.startTime,
            exercise: ex
          });
        }
      });
      
      // Combine and get most recent
      const allHistory = [
        ...workoutsRes.data,
        ...sessionExercises
      ].sort((a, b) => new Date(b.date) - new Date(a.date));
      
      if (allHistory.length > 0) {
        setPerformanceHistory({ [exerciseName]: allHistory[0].exercise });
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    }
  };
  const addSet = () => {
    setCurrentSets([...currentSets, { reps: '', weight: '' }]);
  };

  const updateSet = (index, field, value) => {
    const updated = [...currentSets];
    updated[index][field] = value;
    setCurrentSets(updated);
  };

  const repeatLastSet = () => {
    if (currentSets.length > 0) {
      const lastSet = currentSets[currentSets.length - 1];
      setCurrentSets([...currentSets, { ...lastSet }]);
    }
  };

  const finishExercise = async () => {
    const exerciseData = {
      name: selectedExercise,
      startTime: new Date(Date.now() - exerciseSeconds * 1000),
      endTime: new Date(),
      duration: exerciseSeconds,
      sets: currentSets.filter(s => s.reps && s.weight).map(s => ({
        reps: parseInt(s.reps),
        weight: parseFloat(s.weight),
        timestamp: new Date()
      })),
      notes: exerciseNotes,
      confidence: exerciseConfidence
    };

    const updatedExercises = [...exercises, exerciseData];
    setExercises(updatedExercises);
    // Persist partial progress to server so resuming shows prior exercises
    try {
      const token = localStorage.getItem('token');
      const effectiveSessionId = sessionId || localStorage.getItem('activeSessionId');
      if (effectiveSessionId) {
        await axios.put(`http://localhost:5000/api/sessions/${effectiveSessionId}`, {
          exercises: updatedExercises
        }, { headers: { Authorization: `Bearer ${token}` } });
      }
    } catch (e) {
      console.warn('Failed to autosave exercise to session', e);
    }
    try { recordExercise(selectedExercise, exerciseData.sets?.length || 0); } catch {}
    setCurrentPhase('rest');
    setExerciseSeconds(0);
    setSelectedExercise('');
    setCurrentExerciseIndex(exercises.length);
  };

  const stopSessionNow = async () => {
    if (!window.confirm('Stop session? Your in-progress session will be discarded.')) return;
    try {
      const token = localStorage.getItem('token');
      const effectiveSessionId = sessionId || localStorage.getItem('activeSessionId');
      if (effectiveSessionId) {
        // Prefer deleting the incomplete session to avoid clutter
        await axios.delete(`http://localhost:5000/api/sessions/${effectiveSessionId}`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => {});
      }
    } catch (e) {
      // Non-blocking
    } finally {
      cancel();
      setExercises([]);
      setCurrentPhase('idle');
      navigate('/history');
    }
  };

  const finishSession = async () => {
    try {
      const token = localStorage.getItem('token');
      const effectiveSessionId = sessionId || (() => {
        try { return localStorage.getItem('activeSessionId'); } catch { return null; }
      })();
      if (!effectiveSessionId) {
        alert('No active session found. Please start a session first.');
        return;
      }
      
      // Calculate durations
      const totalActiveDuration = exercises.reduce((sum, ex) => sum + ex.duration, 0);
      const totalRestDuration = exercises.reduce((sum, ex) => sum + (ex.restAfter || 0), 0);
      
      // Update session with all exercises
      await axios.put(`http://localhost:5000/api/sessions/${effectiveSessionId}`, {
        exercises,
        totalDuration: totalTime,
        totalActiveDuration,
        totalRestDuration
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Finish session
      await axios.post(`http://localhost:5000/api/sessions/${effectiveSessionId}/finish`, {
        notes: sessionNotes,
        feeling: sessionFeeling
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // After server saves succeed, end global session and reset timers/metrics
      stop();
      reset();
      try { localStorage.removeItem('activeSessionId'); } catch {}
      // Navigate away from the workout page
      navigate('/history');
    } catch (err) {
      console.error('Finish session error:', err?.response?.data || err?.message || err);
      const status = err?.response?.status;
      const msg = err?.response?.data?.message || err?.message || 'Failed to finish session';
      alert(msg);
      if (status === 401) {
        try { localStorage.removeItem('token'); } catch {}
        navigate('/login');
      }
    }
  };
  // Premium styles shared with other pages
  const bgStyle = {
    minHeight: '100vh',
    padding: '32px 16px 64px',
    background: 'linear-gradient(135deg, #0b1020 0%, #121b3a 60%, #1a234a 100%)',
    position: 'relative'
  };
  const gridOverlay = {
    position: 'absolute',
    inset: 0,
    backgroundImage: 'radial-gradient(1px 1px at 20px 20px, rgba(255,255,255,0.08), rgba(0,0,0,0) 40px)',
    backgroundSize: '40px 40px',
    pointerEvents: 'none'
  };
  const containerStyle = { maxWidth: 1100, margin: '0 auto', position: 'relative' };
  const card = (accent) => ({
    background: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: 20,
    border: '1px solid rgba(255,255,255,0.12)',
    boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
    ...(accent ? { borderImage: 'linear-gradient(90deg, #6ee7f9, #a78bfa) 1', borderWidth: 1, borderStyle: 'solid' } : {})
  });
  const pill = (bg, color = '#fff') => ({
    display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: '6px 12px', borderRadius: 999,
    background: bg, color, fontWeight: 600, fontSize: 13
  });
  const sectionTitle = { color: '#e8ecff', margin: '0 0 10px', fontSize: 18 };
  const labelStyle = { color: '#c9d3ff', fontSize: 13, marginBottom: 6, display: 'block' };
  const inputStyle = { width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)', color: '#fff' };
  const button = (bg, color = '#fff') => ({
    padding: '12px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700,
    background: bg, color, boxShadow: '0 8px 20px rgba(0,0,0,0.3)'
  });

  // Use global totals for main timers as requested
  const activeElapsed = activeTime;
  const restElapsed = restTime;
  const exerciseTabs = [
    ...(currentPhase === 'exercise' && selectedExercise ? [{ name: selectedExercise, live: true, seconds: exerciseSeconds }] : []),
    ...exercises.map(e => ({ name: e.name, live: false, seconds: e.duration || 0 }))
  ];

  return (
    <div style={bgStyle}>
      <div style={gridOverlay} />
      <div style={containerStyle}>
        {/* Top Bar */}
        <div style={{
          ...card(false),
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: 18, marginBottom: 24, position: 'sticky', top: 12, zIndex: 5, backdropFilter: 'blur(6px)'
        }}>
          <div className={styles.dateTimeHeader}>{dateTimeStr}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Removed redundant Total time chip from top bar */}
            <button onClick={() => setIsSidebarOpen(true)} style={button('linear-gradient(90deg,#6366f1,#8b5cf6)')}>View Last Workout</button>
          </div>
        </div>

        {/* Summary View */}
        {sessionSummary ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 18 }}>
            {/* Left: Key Stats and Exercises */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ ...card(true) }}>
                <h2 style={{ color: '#ffffff', marginTop: 0 }}>Well done! 🎉</h2>
                <div style={{ color: '#aab6ff', marginBottom: 12 }}>Here’s a breakdown of your session.</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  <div style={{ ...card(false), padding: 14 }}>
                    <div style={labelStyle}>Active</div>
                    <div style={{ color: '#86efac', fontSize: 22, fontWeight: 800 }}>{formatTime(sessionSummary.totalActiveDuration)}</div>
                  </div>
                  <div style={{ ...card(false), padding: 14 }}>
                    <div style={labelStyle}>Rest</div>
                    <div style={{ color: '#fbbf24', fontSize: 22, fontWeight: 800 }}>{formatTime(sessionSummary.totalRestDuration)}</div>
                  </div>
                  <div style={{ ...card(false), padding: 14 }}>
                    <div style={labelStyle}>Total Volume</div>
                    <div style={{ color: '#e8ecff', fontSize: 22, fontWeight: 800 }}>{Math.round(sessionSummary.volumeTotal)} lbs</div>
                  </div>
                </div>
                <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  <div style={{ ...pill('rgba(255,255,255,0.08)') }}>{sessionSummary.exerciseCount} exercises</div>
                  <div style={{ ...pill('rgba(255,255,255,0.08)') }}>{sessionSummary.setCount} sets</div>
                  <div style={{ ...pill('rgba(255,255,255,0.08)') }}>Avg confidence {sessionSummary.avgConfidence.toFixed(1)}/5</div>
                </div>
              </div>

              <div style={{ ...card(false) }}>
                <h3 style={sectionTitle}>Exercise Breakdown</h3>
                <div style={{ display: 'grid', gap: 10 }}>
                  {sessionSummary.exercises.map((ex, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.04)', padding: 12, borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }}>
                      <div style={{ color: '#e8ecff', fontWeight: 700 }}>{ex.name}</div>
                      <div style={{ color: '#c9d3ff' }}>{ex.setCount} sets</div>
                      <div style={{ color: '#aab6ff' }}>{formatTime(ex.duration)}</div>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        <span style={pill('rgba(255,255,255,0.08)')}>Vol {Math.round(ex.volume)} lbs</span>
                        {ex.bestByWeight?.weight > 0 && (
                          <span style={pill('rgba(255,255,255,0.08)')}>Best {ex.bestByWeight.weight}×{ex.bestByWeight.reps}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Notes and Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ ...card(true) }}>
                <h3 style={sectionTitle}>Session Notes</h3>
                <div style={{ color: '#c9d3ff', whiteSpace: 'pre-wrap' }}>{sessionSummary.notes || 'No notes.'}</div>
                <div style={{ marginTop: 12 }}>
                  <span style={pill('rgba(255,255,255,0.08)')}>Feeling {sessionSummary.feeling}/5</span>
                </div>
              </div>
              <div style={{ ...card(false) }}>
                <h3 style={sectionTitle}>Next</h3>
                <div style={{ display: 'grid', gap: 10 }}>
                  <button onClick={() => navigate('/history')} style={button('linear-gradient(90deg,#6366f1,#8b5cf6)')}>View History</button>
                  <button onClick={() => navigate('/analytics')} style={button('linear-gradient(90deg,#06b6d4,#3b82f6)')}>Open Analytics</button>
                  <button onClick={() => { setSessionSummary(null); navigate('/history'); }} style={button('rgba(255,255,255,0.08)')}>Close</button>
                </div>
              </div>
            </div>
          </div>
  ) : (
  !isSessionActive ? (
          <div style={{ ...card(true), padding: 28, textAlign: 'center' }}>
            <div style={{ color: '#c9d3ff', marginBottom: 8 }}>Ready to train?</div>
            <h1 style={{ color: '#ffffff', marginTop: 0, marginBottom: 16 }}>Start a New Workout Session</h1>
            <div style={{ color: '#aab6ff', marginBottom: 24 }}>Track exercises, sets, and rest with a live timer and finish with a clean summary.</div>
            <button onClick={handleOpenInfoModal} style={button('linear-gradient(90deg,#22c55e,#16a34a)')}>🏋️ Start Session</button>

            {templates && templates.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <div style={{ color: '#aab6ff', marginBottom: 8 }}>Or load a template</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
                  {templates.map(t => (
                    <div key={t._id} style={{ ...pill('rgba(255,255,255,0.08)'), cursor: 'pointer' }}>{t.name}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 18 }}>
            {/* Left Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Timers Card */}
              <div style={{ ...card(true), display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, alignItems: 'center' }}>
                <div>
                  <div style={labelStyle}>Total Time</div>
                  <div style={{ color: '#fff', fontSize: 32, fontWeight: 800 }}>{formatTime(totalTime)}</div>
                </div>
                <div>
                  <div style={labelStyle}>Active</div>
                  <div style={{ color: '#86efac', fontSize: 24, fontWeight: 700 }}>{formatTime(activeElapsed)}</div>
                </div>
                <div>
                  <div style={labelStyle}>Rest</div>
                  <div style={{ color: '#fbbf24', fontSize: 24, fontWeight: 700 }}>{formatTime(restElapsed)}</div>
                </div>
              </div>

              {/* Exercise Tabs */}
              {exerciseTabs.length > 0 && (
                <div style={{ ...card(false) }}>
                  <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                    {exerciseTabs.map((t, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 9999, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', whiteSpace: 'nowrap' }}>
                        <span style={{ color: '#e8ecff', fontWeight: 700 }}>{t.name}</span>
                        <span style={{ color: t.live ? '#86efac' : '#aab6ff' }}>{formatTime(t.seconds)}</span>
                        {t.live && <span style={{ width: 8, height: 8, borderRadius: 8, background: '#22c55e', display: 'inline-block' }} />}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Exercise Picker (when not in exercise) */}
              {currentPhase !== 'exercise' && (
                <div style={{ ...card(false) }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <h3 style={sectionTitle}>Select Exercise</h3>
                    {currentPhase === 'rest' && <span style={pill('rgba(251,191,36,0.15)', '#ffd27a')}>Rest {formatTime(restSeconds)}</span>}
                  </div>
                  <ExerciseSelector exercises={exerciseLibrary} onSelect={selectExercise} placeholder="Choose an exercise..." />
                  {exerciseLibrary.length > 0 && (
                    <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {exerciseLibrary.slice(0, 6).map(ex => (
                        <button key={ex._id} onClick={() => selectExercise(ex.name)} style={button('rgba(255,255,255,0.08)')}>{ex.name}</button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Active Exercise Card */}
              {currentPhase === 'exercise' && (
                <div style={{ ...card(true) }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <h2 style={{ color: '#ffffff', margin: 0 }}>{selectedExercise}</h2>
                    <span style={pill('rgba(52,211,153,0.15)', '#86efac')}>Exercise {formatTime(exerciseSeconds)}</span>
                  </div>

                  {performanceHistory[selectedExercise] && (
                    <div style={{ marginBottom: 12, padding: 12, borderRadius: 10, background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.25)', color: '#dbeafe' }}>
                      <strong style={{ color: '#bfdbfe' }}>Last Performance:</strong>
                      <div style={{ marginTop: 6, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {performanceHistory[selectedExercise].sets.map((set, idx) => (
                          <span key={idx} style={pill('rgba(255,255,255,0.08)')}>{set.weight}×{set.reps}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sets */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={sectionTitle}>Sets</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={addSet} style={button('linear-gradient(90deg,#22c55e,#16a34a)')}>+ Add Set</button>
                      {currentSets.length > 0 && (
                        <button onClick={repeatLastSet} style={button('linear-gradient(90deg,#3b82f6,#6366f1)')}>🔁 Repeat Last</button>
                      )}
                    </div>
                  </div>
                  {currentSets.length === 0 && (
                    <div style={{ color: '#aab6ff', marginBottom: 8 }}>No sets yet. Add your first set to begin tracking.</div>
                  )}
                  {currentSets.map((set, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr', gap: 10, marginBottom: 10 }}>
                      <div style={{ color: '#c9d3ff', display: 'flex', alignItems: 'center' }}>Set {idx + 1}</div>
                      <input type="number" placeholder="Reps" value={set.reps} onChange={(e) => updateSet(idx, 'reps', e.target.value)} style={inputStyle} />
                      <input type="number" placeholder="Weight" value={set.weight} onChange={(e) => updateSet(idx, 'weight', e.target.value)} style={inputStyle} />
                    </div>
                  ))}

                  {/* Notes + Confidence */}
                  <div style={{ marginTop: 10 }}>
                    <label style={labelStyle}>Exercise Notes</label>
                    <textarea rows={2} value={exerciseNotes} onChange={(e) => setExerciseNotes(e.target.value)} style={{ ...inputStyle, resize: 'vertical' }} placeholder="How did this exercise feel?" />
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <label style={labelStyle}>Confidence Level: {exerciseConfidence}</label>
                    <input type="range" min="1" max="5" value={exerciseConfidence} onChange={(e) => setExerciseConfidence(parseInt(e.target.value))} style={{ width: '100%' }} />
                  </div>

                  <button onClick={finishExercise} style={{ ...button('linear-gradient(90deg,#f59e0b,#f97316)'), width: '100%', marginTop: 16 }}>Finish Exercise & Rest</button>
                </div>
              )}

              {/* Completed Exercises */}
              {exercises.length > 0 && (
                <div style={{ ...card(false) }}>
                  <h3 style={sectionTitle}>Completed Exercises</h3>
                  <div style={{ display: 'grid', gap: 10 }}>
                    {exercises.map((ex, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.04)', padding: 12, borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ color: '#e8ecff', fontWeight: 600 }}>{ex.name}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={pill('rgba(255,255,255,0.08)')}>{ex.sets.length} sets</span>
                          <span style={pill('rgba(255,255,255,0.08)')}>{formatTime(ex.duration)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Session Summary / Finish */}
              <div style={{ ...card(true) }}>
                <h3 style={sectionTitle}>Finish Workout</h3>
                {exercises.length === 0 && (
                  <div style={{ color: '#aab6ff', marginBottom: 12 }}>Add at least one exercise to finish the session.</div>
                )}
                <div style={{ marginBottom: 12 }}>
                  <label style={labelStyle}>Overall Notes</label>
                  <textarea rows={3} value={sessionNotes} onChange={(e) => setSessionNotes(e.target.value)} style={{ ...inputStyle, resize: 'vertical' }} placeholder="How was the workout overall?" />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={labelStyle}>Overall Feeling: {sessionFeeling}</label>
                  <input type="range" min="1" max="5" value={sessionFeeling} onChange={(e) => setSessionFeeling(parseInt(e.target.value))} style={{ width: '100%' }} />
                </div>
                <button disabled={exercises.length === 0} onClick={finishSession} style={{ ...button('linear-gradient(90deg,#ef4444,#dc2626)'), width: '100%', opacity: exercises.length === 0 ? 0.6 : 1 }}>
                  🏁 Finish Workout Session
                </button>
                <button onClick={stopSessionNow} style={{ ...button('rgba(255,255,255,0.08)'), width: '100%', marginTop: 10 }}>
                  ⏹️ Stop Session
                </button>
              </div>

              {/* Helpful Tips */}
              <div style={{ ...card(false) }}>
                <h3 style={sectionTitle}>Tips</h3>
                <ul style={{ margin: 0, paddingLeft: 18, color: '#c9d3ff' }}>
                  <li>Use quick exercise buttons for your frequent lifts.</li>
                  <li>Repeat last set to speed up similar sets.</li>
                  <li>Finish exercise to automatically track rest time.</li>
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Sidebar Modal: Last Workout */}
      <div className={`${styles.sidebar} ${isSidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarHeader}>
          <h3>Last Workout</h3>
          <button className={styles.closeButton} onClick={() => setIsSidebarOpen(false)}>Close</button>
        </div>
        <div className={styles.sidebarContent}>
          {/* Placeholder summary data */}
          <div className={styles.sidebarItem}><span className={styles.label}>Name:</span> Push Day</div>
          <div className={styles.sidebarItem}><span className={styles.label}>Date:</span> {new Date().toLocaleDateString()}</div>
          <div className={styles.sidebarItem}><span className={styles.label}>Summary:</span> Bench Press 5x5, OHP 3x8, Triceps 3x12</div>
        </div>
      </div>
  {isSidebarOpen && <div className={styles.overlay} onClick={() => setIsSidebarOpen(false)} />}

      {/* Information/Confirmation Modal */}
      {isInfoModalOpen && (
        <>
          <div className={styles.overlay} onClick={handleCancelInfoModal} />
          <div className={styles.modal} role="dialog" aria-modal="true">
            <div className={styles.modalContent}>
              <h2 style={{ marginTop: 0 }}>Ready to train?</h2>
              <p style={{ color: '#c9d3ff' }}>Start a new workout session with live timers, exercise tracking, and a clean summary when you finish.</p>
              <div className={styles.modalActions}>
                <button className={styles.secondaryBtn} onClick={handleCancelInfoModal}>Cancel</button>
                <button className={styles.primaryBtn} onClick={handleContinueInfoModal}>Continue</button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default StartSession;
