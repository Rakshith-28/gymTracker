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

  useEffect(() => {
    fetchWorkouts();
  }, []);

  const handleDelete = async (workoutId) => {
    if (!window.confirm('Are you sure you want to delete this workout?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/workouts/${workoutId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert('Workout deleted successfully!');
      fetchWorkouts(); // Refresh the list
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
          <div key={workout._id} style={{ marginBottom: '30px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3>{new Date(workout.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
              <div style={{ display: 'flex', gap: '10px' }}>
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
                <button onClick={() => handleDelete(workout._id)} style={{
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