import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function WorkoutHistory() {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchWorkouts = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      // Fetch both regular workouts and sessions
      const [workoutsRes, sessionsRes] = await Promise.all([
        axios.get('http://localhost:5000/api/workouts', { headers }),
        axios.get('http://localhost:5000/api/sessions', { headers })
      ]);
      
      // Combine and sort by date
      const allWorkouts = [
        ...workoutsRes.data.map(w => ({ ...w, type: 'workout' })),
        ...sessionsRes.data.map(s => ({ ...s, type: 'session', date: s.startTime }))
      ].sort((a, b) => new Date(b.date) - new Date(a.date));
      
      setWorkouts(allWorkouts);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching workouts:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkouts();
  }, []);

  const handleDelete = async (workoutId, type) => {
    if (!window.confirm('Are you sure you want to delete this workout?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const endpoint = type === 'session' 
        ? `http://localhost:5000/api/sessions/${workoutId}`
        : `http://localhost:5000/api/workouts/${workoutId}`;
      
      await axios.delete(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert('Workout deleted successfully!');
      fetchWorkouts();
    } catch (err) {
      alert('Failed to delete workout');
      console.error('Error deleting workout:', err);
    }
  };

  const handleEdit = (workoutId) => {
    navigate(`/edit-workout/${workoutId}`);
  };

  if (loading) return <div style={{ padding: '50px', textAlign: 'center' }}>Loading...</div>;

  return (
    <div style={{ maxWidth: '900px', margin: '50px auto', padding: '20px' }}>
      <h2>Workout History</h2>
      
      {workouts.length === 0 ? (
        <p>No workouts logged yet. <a href="/log-workout">Log your first workout!</a></p>
      ) : (
        workouts.map(workout => (
          <div key={workout._id} style={{ 
            marginBottom: '30px', 
            padding: '20px', 
            border: '1px solid #ddd', 
            borderRadius: '8px', 
            backgroundColor: workout.type === 'session' ? '#e8f5e9' : 'white' 
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <div>
                <h3>{new Date(workout.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
                {workout.type === 'session' && (
                  <span style={{ backgroundColor: '#4CAF50', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', marginLeft: '10px' }}>
                    LIVE SESSION
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                {workout.type === 'workout' && (
                  <button onClick={() => handleEdit(workout._id)} style={{
                    padding: '8px 15px',
                    backgroundColor: '#2196F3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}>
                    Edit
                  </button>
                )}
                <button onClick={() => handleDelete(workout._id, workout.type)} style={{
                  padding: '8px 15px',
                  backgroundColor: '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}>
                  Delete
                </button>
              </div>
            </div>

            {/* Session-specific info */}
            {workout.type === 'session' && (
              <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#fff9c4', borderRadius: '4px' }}>
                <p><strong>Total Duration:</strong> {Math.floor(workout.totalDuration / 60)}m {workout.totalDuration % 60}s</p>
                <p><strong>Active Time:</strong> {Math.floor(workout.totalActiveDuration / 60)}m {workout.totalActiveDuration % 60}s</p>
                <p><strong>Rest Time:</strong> {Math.floor(workout.totalRestDuration / 60)}m {workout.totalRestDuration % 60}s</p>
                {workout.totalVolume && <p><strong>Total Volume:</strong> {workout.totalVolume.toLocaleString()} lbs</p>}
                {workout.feeling && <p><strong>Overall Feeling:</strong> {'⭐'.repeat(workout.feeling)}</p>}
              </div>
            )}

            {/* Regular workout info */}
            {workout.type === 'workout' && workout.duration && (
              <p><strong>Duration:</strong> {workout.duration} minutes</p>
            )}
            
            {workout.exercises.map((exercise, idx) => (
              <div key={idx} style={{ marginTop: '15px' }}>
                <h4>{exercise.name}</h4>
                {workout.type === 'session' && exercise.duration && (
                  <p style={{ fontSize: '14px', color: '#666' }}>
                    Exercise Duration: {Math.floor(exercise.duration / 60)}m {exercise.duration % 60}s
                    {exercise.confidence && ` | Confidence: ${'⭐'.repeat(exercise.confidence)}`}
                  </p>
                )}
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #ddd' }}>
                      <th style={{ padding: '8px', textAlign: 'left' }}>Set</th>
                      <th style={{ padding: '8px', textAlign: 'left' }}>Reps</th>
                      <th style={{ padding: '8px', textAlign: 'left' }}>Weight (lbs)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exercise.sets.map((set, setIdx) => (
                      <tr key={setIdx} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '8px' }}>{setIdx + 1}</td>
                        <td style={{ padding: '8px' }}>{set.reps}</td>
                        <td style={{ padding: '8px' }}>{set.weight}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {exercise.notes && (
                  <p style={{ marginTop: '10px', fontSize: '14px', fontStyle: 'italic', color: '#666' }}>
                    Note: {exercise.notes}
                  </p>
                )}
              </div>
            ))}
            
            {workout.notes && (
              <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#f9f9f9', borderRadius: '5px' }}>
                <strong>Notes:</strong> {workout.notes}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

export default WorkoutHistory;