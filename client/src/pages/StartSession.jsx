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
  
  const navigate = useNavigate();

  // Fetch exercise library and templates on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        
        const [exercisesRes, templatesRes] = await Promise.all([
          axios.get('http://localhost:5000/api/exercises', { headers }),
          axios.get('http://localhost:5000/api/templates', { headers })
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
  // If in rest phase, stop rest timer
  if (currentPhase === 'rest') {
    const restDuration = restSeconds;
    // Update last exercise with rest duration
    const updatedExercises = [...exercises];
    updatedExercises[updatedExercises.length - 1].restAfter = restDuration;
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
      const ex = session.exercises.find(e => e.name === exerciseName);
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
      
      alert('Session completed!');
      navigate('/history');
    } catch (err) {
      alert('Failed to finish session');
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '50px auto', padding: '20px' }}>
      <h2>Workout Session</h2>

      {!sessionActive ? (
        <div>
          <button onClick={startSession} style={{
            width: '100%',
            padding: '20px',
            fontSize: '24px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            marginBottom: '20px'
          }}>
            🏋️ Start Workout Session
          </button>

          {templates.length > 0 && (
            <div>
              <h3>Or Load a Template:</h3>
              {templates.map(template => (
                <button key={template._id} style={{
                  padding: '15px',
                  margin: '10px',
                  backgroundColor: '#2196F3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}>
                  {template.name}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          {/* Timer Display */}
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h1>Total Time: {formatTime(totalSeconds)}</h1>
            {currentPhase === 'exercise' && (
              <p style={{ fontSize: '24px', color: '#4CAF50' }}>
                Exercise Time: {formatTime(exerciseSeconds)}
              </p>
            )}
            {currentPhase === 'rest' && (
              <p style={{ fontSize: '24px', color: '#FF9800' }}>
                Rest Time: {formatTime(restSeconds)}
              </p>
            )}
          </div>

          {/* Exercise Selection */}
          {currentPhase !== 'exercise' && (
            <div style={{ marginBottom: '30px' }}>
              <h3>Select Next Exercise:</h3>
              <select
                value={selectedExercise}
                onChange={(e) => selectExercise(e.target.value)}
                style={{ width: '100%', padding: '12px', fontSize: '16px' }}
              >
                <option value="">Choose an exercise...</option>
                {exerciseLibrary.map(ex => (
                  <option key={ex._id} value={ex.name}>{ex.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Active Exercise */}
          {currentPhase === 'exercise' && (
            <div style={{ padding: '20px', border: '2px solid #4CAF50', borderRadius: '8px' }}>
              <h2>{selectedExercise}</h2>

              {/* Performance History */}
              {performanceHistory[selectedExercise] && (
                <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#e3f2fd', borderRadius: '4px' }}>
                  <strong>Last Performance:</strong>
                  {performanceHistory[selectedExercise].sets.map((set, idx) => (
                    <span key={idx}> {set.weight}lbs × {set.reps} </span>
                  ))}
                </div>
              )}

              {/* Sets */}
              {currentSets.map((set, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                  <span style={{ padding: '10px' }}>Set {idx + 1}:</span>
                  <input
                    type="number"
                    placeholder="Reps"
                    value={set.reps}
                    onChange={(e) => updateSet(idx, 'reps', e.target.value)}
                    style={{ flex: 1, padding: '10px' }}
                  />
                  <input
                    type="number"
                    placeholder="Weight"
                    value={set.weight}
                    onChange={(e) => updateSet(idx, 'weight', e.target.value)}
                    style={{ flex: 1, padding: '10px' }}
                  />
                </div>
              ))}

              <button onClick={addSet} style={{
                padding: '10px 20px',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                marginRight: '10px'
              }}>
                + Add Set
              </button>

              {currentSets.length > 0 && (
                <button onClick={repeatLastSet} style={{
                  padding: '10px 20px',
                  backgroundColor: '#2196F3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}>
                  🔁 Repeat Last Set
                </button>
              )}

              {/* Exercise Notes and Confidence */}
              <div style={{ marginTop: '20px' }}>
                <label>Notes for this exercise:</label>
                <textarea
                  value={exerciseNotes}
                  onChange={(e) => setExerciseNotes(e.target.value)}
                  rows="2"
                  style={{ width: '100%', padding: '10px', marginTop: '5px' }}
                  placeholder="How did this exercise feel?"
                />
              </div>

              <div style={{ marginTop: '15px' }}>
                <label>Confidence Level (1-5): {exerciseConfidence}</label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={exerciseConfidence}
                  onChange={(e) => setExerciseConfidence(parseInt(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>

              <button onClick={finishExercise} style={{
                width: '100%',
                marginTop: '20px',
                padding: '15px',
                backgroundColor: '#FF9800',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '18px',
                cursor: 'pointer'
              }}>
                Finish Exercise & Rest
              </button>
            </div>
          )}

          {/* Completed Exercises Summary */}
          {exercises.length > 0 && (
            <div style={{ marginTop: '30px' }}>
              <h3>Completed Exercises:</h3>
              {exercises.map((ex, idx) => (
                <div key={idx} style={{ padding: '10px', marginBottom: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                  <strong>{ex.name}</strong> - {ex.sets.length} sets ({formatTime(ex.duration)})
                </div>
              ))}
            </div>
          )}

          {/* Finish Workout Button */}
          {exercises.length > 0 && (
            <div style={{ marginTop: '30px', padding: '20px', border: '2px solid #f44336', borderRadius: '8px' }}>
              <h3>Finish Workout</h3>
              
              <div style={{ marginBottom: '15px' }}>
                <label>Overall Notes:</label>
                <textarea
                  value={sessionNotes}
                  onChange={(e) => setSessionNotes(e.target.value)}
                  rows="3"
                  style={{ width: '100%', padding: '10px', marginTop: '5px' }}
                  placeholder="How was the workout overall?"
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label>Overall Feeling (1-5): {sessionFeeling}</label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={sessionFeeling}
                  onChange={(e) => setSessionFeeling(parseInt(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>

              <button onClick={finishSession} style={{
                width: '100%',
                padding: '15px',
                backgroundColor: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '18px',
                cursor: 'pointer'
              }}>
                🏁 Finish Workout Session
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default StartSession;
