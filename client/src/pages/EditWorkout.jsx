 
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

function EditWorkout() {
  const { id } = useParams();
  const [exercises, setExercises] = useState([]);
  const [selectedExercises, setSelectedExercises] = useState([]);
  const [notes, setNotes] = useState('');
  const [duration, setDuration] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Fetch exercise library and workout data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };

        const [exercisesRes, workoutRes] = await Promise.all([
          axios.get('http://localhost:5000/api/exercises', { headers }),
          axios.get(`http://localhost:5000/api/workouts/${id}`, { headers })
        ]);

        setExercises(exercisesRes.data);
        
        const workout = workoutRes.data;
        setSelectedExercises(workout.exercises);
        setNotes(workout.notes || '');
        setDuration(workout.duration || '');
        setLoading(false);
      } catch (err) {
        setError('Failed to load workout');
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const addExercise = () => {
    setSelectedExercises([
      ...selectedExercises,
      { name: '', sets: [{ reps: '', weight: '' }] }
    ]);
  };

  const addSet = (exerciseIndex) => {
    const updated = [...selectedExercises];
    updated[exerciseIndex].sets.push({ reps: '', weight: '' });
    setSelectedExercises(updated);
  };

  const removeSet = (exerciseIndex, setIndex) => {
    const updated = [...selectedExercises];
    updated[exerciseIndex].sets.splice(setIndex, 1);
    setSelectedExercises(updated);
  };

  const removeExercise = (exerciseIndex) => {
    const updated = [...selectedExercises];
    updated.splice(exerciseIndex, 1);
    setSelectedExercises(updated);
  };

  const updateExerciseName = (index, name) => {
    const updated = [...selectedExercises];
    updated[index].name = name;
    setSelectedExercises(updated);
  };

  const updateSet = (exerciseIndex, setIndex, field, value) => {
    const updated = [...selectedExercises];
    updated[exerciseIndex].sets[setIndex][field] = value;
    setSelectedExercises(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      
      const validExercises = selectedExercises
        .filter(ex => ex.name)
        .map(ex => ({
          name: ex.name,
          sets: ex.sets
            .filter(set => set.reps && set.weight)
            .map(set => ({
              reps: parseInt(set.reps),
              weight: parseFloat(set.weight)
            }))
        }))
        .filter(ex => ex.sets.length > 0);

      if (validExercises.length === 0) {
        setError('Please add at least one exercise with sets');
        return;
      }

      await axios.put(`http://localhost:5000/api/workouts/${id}`, {
        exercises: validExercises,
        notes,
        duration: duration ? parseInt(duration) : undefined
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert('Workout updated successfully!');
      navigate('/history');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update workout');
    }
  };

  if (loading) return <div style={{ padding: '50px', textAlign: 'center' }}>Loading...</div>;

  return (
    <div style={{ maxWidth: '800px', margin: '50px auto', padding: '20px' }}>
      <h2>Edit Workout</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      
      <form onSubmit={handleSubmit}>
        {selectedExercises.map((exercise, exerciseIndex) => (
          <div key={exerciseIndex} style={{ marginBottom: '30px', padding: '15px', border: '1px solid #ddd', position: 'relative' }}>
            <button type="button" onClick={() => removeExercise(exerciseIndex)} style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              padding: '5px 10px',
              backgroundColor: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}>
              Remove Exercise
            </button>

            <h3>Exercise {exerciseIndex + 1}</h3>
            
            <select
              value={exercise.name}
              onChange={(e) => updateExerciseName(exerciseIndex, e.target.value)}
              style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
            >
              <option value="">Select Exercise</option>
              {exercises.map(ex => (
                <option key={ex._id} value={ex.name}>{ex.name}</option>
              ))}
            </select>

            {exercise.sets.map((set, setIndex) => (
              <div key={setIndex} style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center' }}>
                <span style={{ padding: '10px' }}>Set {setIndex + 1}:</span>
                <input
                  type="number"
                  placeholder="Reps"
                  value={set.reps}
                  onChange={(e) => updateSet(exerciseIndex, setIndex, 'reps', e.target.value)}
                  style={{ flex: 1, padding: '10px' }}
                />
                <input
                  type="number"
                  placeholder="Weight (lbs)"
                  value={set.weight}
                  onChange={(e) => updateSet(exerciseIndex, setIndex, 'weight', e.target.value)}
                  style={{ flex: 1, padding: '10px' }}
                />
                <button type="button" onClick={() => removeSet(exerciseIndex, setIndex)} style={{
                  padding: '8px 12px',
                  backgroundColor: '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}>
                  ✕
                </button>
              </div>
            ))}

            <button type="button" onClick={() => addSet(exerciseIndex)} style={{ padding: '8px 15px', marginTop: '10px' }}>
              + Add Set
            </button>
          </div>
        ))}

        <button type="button" onClick={addExercise} style={{ padding: '10px 20px', marginBottom: '20px' }}>
          + Add Exercise
        </button>

        <div style={{ marginBottom: '20px' }}>
          <label>Duration (minutes):</label>
          <input
            type="number"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            style={{ width: '100%', padding: '10px', marginTop: '5px' }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label>Notes:</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows="4"
            style={{ width: '100%', padding: '10px', marginTop: '5px' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="submit" style={{ flex: 1, padding: '15px', backgroundColor: '#4CAF50', color: 'white', border: 'none', fontSize: '16px' }}>
            Update Workout
          </button>
          <button type="button" onClick={() => navigate('/history')} style={{ flex: 1, padding: '15px', backgroundColor: '#999', color: 'white', border: 'none', fontSize: '16px' }}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default EditWorkout;