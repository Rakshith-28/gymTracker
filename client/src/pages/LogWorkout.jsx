 import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function LogWorkout() {
  const [exercises, setExercises] = useState([]);
  const [selectedExercises, setSelectedExercises] = useState([
    { name: '', sets: [{ reps: '', weight: '' }] }
  ]);
  const [notes, setNotes] = useState('');
  const [duration, setDuration] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Fetch exercises from backend
  useEffect(() => {
    const fetchExercises = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:5000/api/exercises', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setExercises(response.data);
      } catch (err) {
        console.error('Error fetching exercises:', err);
      }
    };
    fetchExercises();
  }, []);

  // Add new exercise to workout
  const addExercise = () => {
    setSelectedExercises([
      ...selectedExercises,
      { name: '', sets: [{ reps: '', weight: '' }] }
    ]);
  };

  // Add set to specific exercise
  const addSet = (exerciseIndex) => {
    const updated = [...selectedExercises];
    updated[exerciseIndex].sets.push({ reps: '', weight: '' });
    setSelectedExercises(updated);
  };

  // Update exercise name
  const updateExerciseName = (index, name) => {
    const updated = [...selectedExercises];
    updated[index].name = name;
    setSelectedExercises(updated);
  };

  // Update set data
  const updateSet = (exerciseIndex, setIndex, field, value) => {
    const updated = [...selectedExercises];
    updated[exerciseIndex].sets[setIndex][field] = value;
    setSelectedExercises(updated);
  };

  // Submit workout
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      
      // Filter out empty exercises and convert strings to numbers
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

      await axios.post('http://localhost:5000/api/workouts', {
        exercises: validExercises,
        notes,
        duration: duration ? parseInt(duration) : undefined
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert('Workout logged successfully!');
      navigate('/history');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to log workout');
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '50px auto', padding: '20px' }}>
      <h2>Log Workout</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      
      <form onSubmit={handleSubmit}>
        {selectedExercises.map((exercise, exerciseIndex) => (
          <div key={exerciseIndex} style={{ marginBottom: '30px', padding: '15px', border: '1px solid #ddd' }}>
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
              <div key={setIndex} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
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

        <button type="submit" style={{ width: '100%', padding: '15px', backgroundColor: '#4CAF50', color: 'white', border: 'none', fontSize: '16px' }}>
          Save Workout
        </button>
      </form>
    </div>
  );
}

export default LogWorkout;

