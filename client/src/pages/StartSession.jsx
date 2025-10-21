 import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function StartSession() {
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [totalSeconds, setTotalSeconds] = useState(0);
  
  const [currentPhase, setCurrentPhase] = useState('idle'); // 'idle', 'exercise', 'rest'
  const [exerciseSeconds, setExerciseSeconds] = useState(0);
  const [restSeconds, setRestSeconds] = useState(0);
  
  const [exercises, setExercises] = useState([]);
  const [exerciseLibrary, setExerciseLibrary] = useState([]);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(-1);
  
  const [selectedExercise, setSelectedExercise] = useState('');
  const [currentSets, setCurrentSets] = useState([]);
  const [exerciseNotes, setExerciseNotes] = useState('');
  const [exerciseConfidence, setExerciseConfidence] = useState(3);
  
  const [templates, setTemplates] = useState([]);
  const [sessionNotes, setSessionNotes] = useState('');
  const [sessionFeeling, setSessionFeeling] = useState(3);
  
  const [performanceHistory, setPerformanceHistory] = useState({});
  const [sessionSummary, setSessionSummary] = useState(null);
  
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

  // Total workout timer
  useEffect(() => {
    let interval;
    if (sessionActive) {
      interval = setInterval(() => {
        setTotalSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [sessionActive]);

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
      setSessionActive(true);
      setCurrentPhase('idle');
    } catch (err) {
      alert('Failed to start session');
    }
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

  const finishExercise = () => {
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

    setExercises([...exercises, exerciseData]);
    setCurrentPhase('rest');
    setExerciseSeconds(0);
    setSelectedExercise('');
    setCurrentExerciseIndex(exercises.length);
  };

  const finishSession = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Calculate durations
      const totalActiveDuration = exercises.reduce((sum, ex) => sum + ex.duration, 0);
      const totalRestDuration = exercises.reduce((sum, ex) => sum + (ex.restAfter || 0), 0);
      
      // Update session with all exercises
      await axios.put(`http://localhost:5000/api/sessions/${sessionId}`, {
        exercises,
        totalDuration: totalSeconds,
        totalActiveDuration,
        totalRestDuration
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Finish session
      const response = await axios.post(`http://localhost:5000/api/sessions/${sessionId}/finish`, {
        notes: sessionNotes,
        feeling: sessionFeeling
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Build local summary insights
      const setCount = exercises.reduce((acc, ex) => acc + (ex.sets?.length || 0), 0);
      const volumeTotal = exercises.reduce((acc, ex) => acc + (ex.sets || []).reduce((s, t) => s + ((Number(t.weight) || 0) * (Number(t.reps) || 0)), 0), 0);
      const avgConfidence = exercises.length ? (exercises.reduce((acc, ex) => acc + (Number(ex.confidence) || 0), 0) / exercises.length) : 0;
      const perExercise = exercises.map(ex => {
        const exVolume = (ex.sets || []).reduce((s, t) => s + ((Number(t.weight) || 0) * (Number(t.reps) || 0)), 0);
        const bestByWeight = (ex.sets || []).reduce((best, s) => (Number(s.weight) || 0) > (Number(best.weight) || 0) ? s : best, { weight: 0, reps: 0 });
        const bestByVolume = (ex.sets || []).reduce((best, s) => ((Number(s.weight) || 0) * (Number(s.reps) || 0)) > (((Number(best.weight) || 0) * (Number(best.reps) || 0))) ? s : best, { weight: 0, reps: 0 });
        return {
          name: ex.name,
          sets: ex.sets || [],
          setCount: (ex.sets || []).length,
          duration: ex.duration || 0,
          restAfter: ex.restAfter || 0,
          volume: exVolume,
          bestByWeight,
          bestByVolume
        };
      });
      setSessionSummary({
        sessionId,
        totalDuration: totalSeconds,
        totalActiveDuration,
        totalRestDuration,
        exercises: perExercise,
        exerciseCount: exercises.length,
        setCount,
        volumeTotal,
        avgConfidence,
        notes: sessionNotes,
        feeling: sessionFeeling,
        server: response?.data || null
      });
      setSessionActive(false);
    } catch (err) {
      alert('Failed to finish session');
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

  const activeElapsed = exercises.reduce((sum, ex) => sum + (ex.duration || 0), 0) + (currentPhase === 'exercise' ? exerciseSeconds : 0);
  const restElapsed = exercises.reduce((sum, ex) => sum + (ex.restAfter || 0), 0) + (currentPhase === 'rest' ? restSeconds : 0);

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
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={pill('linear-gradient(90deg,#34d399,#10b981)')}>{sessionSummary ? 'Session Finished' : (sessionActive ? 'Active Session' : 'No Session')}</div>
            <h2 style={{ color: '#f4f7ff', margin: 0 }}>{sessionSummary ? 'Session Summary' : 'Start Session'}</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {(sessionActive || sessionSummary) && (
              <span style={pill('rgba(255,255,255,0.08)')}>Total {formatTime(totalSeconds)}</span>
            )}
            <button onClick={() => navigate('/history')} style={button('linear-gradient(90deg,#6366f1,#8b5cf6)')}>History</button>
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
  !sessionActive ? (
          <div style={{ ...card(true), padding: 28, textAlign: 'center' }}>
            <div style={{ color: '#c9d3ff', marginBottom: 8 }}>Ready to train?</div>
            <h1 style={{ color: '#ffffff', marginTop: 0, marginBottom: 16 }}>Start a New Workout Session</h1>
            <div style={{ color: '#aab6ff', marginBottom: 24 }}>Track exercises, sets, and rest with a live timer and finish with a clean summary.</div>
            <button onClick={startSession} style={button('linear-gradient(90deg,#22c55e,#16a34a)')}>🏋️ Start Session</button>

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
                  <div style={{ color: '#fff', fontSize: 32, fontWeight: 800 }}>{formatTime(totalSeconds)}</div>
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

              {/* Exercise Picker (when not in exercise) */}
              {currentPhase !== 'exercise' && (
                <div style={{ ...card(false) }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <h3 style={sectionTitle}>Select Next Exercise</h3>
                    {currentPhase === 'rest' && <span style={pill('rgba(251,191,36,0.15)', '#ffd27a')}>Rest {formatTime(restSeconds)}</span>}
                  </div>
                  <select value={selectedExercise} onChange={(e) => selectExercise(e.target.value)} style={inputStyle}>
                    <option value="">Choose an exercise...</option>
                    {exerciseLibrary.map(ex => (
                      <option key={ex._id} value={ex.name}>{ex.name}</option>
                    ))}
                  </select>
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
    </div>
  );
}

export default StartSession;
