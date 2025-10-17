import { useState, useEffect } from 'react';
import axios from 'axios';

function Analytics() {
  const [prs, setPrs] = useState({});
  const [stats, setStats] = useState(null);
  const [frequency, setFrequency] = useState([]);
  const [muscleDistribution, setMuscleDistribution] = useState({});
  const [selectedExercise, setSelectedExercise] = useState('');
  const [strengthProgress, setStrengthProgress] = useState([]);
  const [volumeProgress, setVolumeProgress] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };

        // Fetch all analytics data
        const [prsRes, statsRes, freqRes, muscleRes] = await Promise.all([
          axios.get('http://localhost:5000/api/analytics/prs', { headers }),
          axios.get('http://localhost:5000/api/workouts/stats', { headers }),
          axios.get('http://localhost:5000/api/analytics/frequency?weeks=12', { headers }),
          axios.get('http://localhost:5000/api/analytics/muscle-distribution?days=30', { headers })
        ]);

        setPrs(prsRes.data);
        setStats(statsRes.data);
        setFrequency(freqRes.data);
        setMuscleDistribution(muscleRes.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching analytics:', err);
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  const handleExerciseSelect = async (exerciseName) => {
    setSelectedExercise(exerciseName);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [strengthRes, volumeRes] = await Promise.all([
        axios.get(`http://localhost:5000/api/analytics/strength/${exerciseName}`, { headers }),
        axios.get(`http://localhost:5000/api/analytics/volume/${exerciseName}?days=90`, { headers })
      ]);

      setStrengthProgress(strengthRes.data);
      setVolumeProgress(volumeRes.data);
    } catch (err) {
      console.error('Error fetching exercise progress:', err);
    }
  };

  if (loading) return <div style={{ padding: '50px', textAlign: 'center' }}>Loading analytics...</div>;

  return (
    <div style={{ maxWidth: '1200px', margin: '50px auto', padding: '20px' }}>
      <h2>Analytics Dashboard</h2>

      {/* Overall Stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginTop: '30px' }}>
          <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px', textAlign: 'center' }}>
            <h3 style={{ fontSize: '36px', color: '#4CAF50', margin: '10px 0' }}>{stats.totalWorkouts}</h3>
            <p>Total Workouts</p>
          </div>
          <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px', textAlign: 'center' }}>
            <h3 style={{ fontSize: '36px', color: '#2196F3', margin: '10px 0' }}>{stats.totalExercises}</h3>
            <p>Total Exercises</p>
          </div>
          <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px', textAlign: 'center' }}>
            <h3 style={{ fontSize: '36px', color: '#FF9800', margin: '10px 0' }}>{stats.totalDuration}</h3>
            <p>Total Minutes</p>
          </div>
          <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px', textAlign: 'center' }}>
            <h3 style={{ fontSize: '36px', color: '#9C27B0', margin: '10px 0' }}>{stats.averageDuration}</h3>
            <p>Avg Duration (min)</p>
          </div>
        </div>
      )}

      {/* Personal Records */}
      <div style={{ marginTop: '40px' }}>
        <h3>Personal Records (PRs)</h3>
        <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
          {Object.keys(prs).length === 0 ? (
            <p>No PRs yet. Keep working out!</p>
          ) : (
            Object.entries(prs).map(([exercise, pr]) => (
              <div key={exercise} style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '8px', cursor: 'pointer', backgroundColor: selectedExercise === exercise ? '#e3f2fd' : 'white' }}
                onClick={() => handleExerciseSelect(exercise)}>
                <h4>{exercise}</h4>
                <p><strong>{pr.weight} lbs</strong> × {pr.reps} reps</p>
                <p style={{ fontSize: '12px', color: '#666' }}>Est. 1RM: {pr.oneRepMax} lbs</p>
                <p style={{ fontSize: '12px', color: '#666' }}>{new Date(pr.date).toLocaleDateString()}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Exercise Progress (when selected) */}
      {selectedExercise && (
        <div style={{ marginTop: '40px', padding: '20px', border: '2px solid #2196F3', borderRadius: '8px' }}>
          <h3>{selectedExercise} Progress</h3>
          
          {/* Strength Progress */}
          <div style={{ marginTop: '20px' }}>
            <h4>Max Weight Over Time</h4>
            <div style={{ marginTop: '15px' }}>
              {strengthProgress.map((entry, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', borderBottom: '1px solid #eee' }}>
                  <span>{new Date(entry.date).toLocaleDateString()}</span>
                  <span><strong>{entry.maxWeight} lbs</strong> × {entry.reps} reps</span>
                </div>
              ))}
            </div>
          </div>

          {/* Volume Progress */}
          <div style={{ marginTop: '30px' }}>
            <h4>Total Volume Over Time</h4>
            <div style={{ marginTop: '15px' }}>
              {volumeProgress.map((entry, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', borderBottom: '1px solid #eee' }}>
                  <span>{new Date(entry.date).toLocaleDateString()}</span>
                  <span><strong>{entry.volume.toLocaleString()} lbs</strong> ({entry.sets} sets)</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Workout Frequency */}
      <div style={{ marginTop: '40px' }}>
        <h3>Workout Frequency (Last 12 Weeks)</h3>
        <div style={{ marginTop: '20px' }}>
          {frequency.length === 0 ? (
            <p>No workout frequency data yet.</p>
          ) : (
            frequency.map((week, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ width: '150px' }}>{new Date(week.weekStart).toLocaleDateString()}</span>
                <div style={{ flex: 1, height: '30px', backgroundColor: '#e0e0e0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(week.count / 7) * 100}%`, backgroundColor: '#4CAF50', display: 'flex', alignItems: 'center', paddingLeft: '10px', color: 'white' }}>
                    {week.count} workouts
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Muscle Group Distribution */}
      <div style={{ marginTop: '40px' }}>
        <h3>Muscle Group Distribution (Last 30 Days)</h3>
        <div style={{ marginTop: '20px' }}>
          {Object.entries(muscleDistribution).map(([muscle, count]) => (
            <div key={muscle} style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ width: '150px', textTransform: 'capitalize' }}>{muscle}</span>
              <div style={{ flex: 1, height: '30px', backgroundColor: '#e0e0e0', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(count / Math.max(...Object.values(muscleDistribution))) * 100}%`, backgroundColor: '#2196F3', display: 'flex', alignItems: 'center', paddingLeft: '10px', color: 'white' }}>
                  {count} exercises
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Analytics;