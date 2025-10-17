 import { useState, useEffect } from 'react';
import axios from 'axios';

function WorkoutHistory() {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWorkouts = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:5000/api/workouts', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setWorkouts(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching workouts:', err);
        setLoading(false);
      }
    };
    fetchWorkouts();
  }, []);

  if (loading) return <div style={{ padding: '50px', textAlign: 'center' }}>Loading...</div>;

  return (
    <div style={{ maxWidth: '900px', margin: '50px auto', padding: '20px' }}>
      <h2>Workout History</h2>
      
      {workouts.length === 0 ? (
        <p>No workouts logged yet. <a href="/log-workout">Log your first workout!</a></p>
      ) : (
        workouts.map(workout => (
          <div key={workout._id} style={{ marginBottom: '30px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
            <h3>{new Date(workout.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
            {workout.duration && <p><strong>Duration:</strong> {workout.duration} minutes</p>}
            
            {workout.exercises.map((exercise, idx) => (
              <div key={idx} style={{ marginTop: '15px' }}>
                <h4>{exercise.name}</h4>
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

