import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useWorkout } from '../context/WorkoutContext.jsx';
import styles from './ActiveSessionSidebar.module.css';

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function ActiveSessionSidebar() {
  const navigate = useNavigate();
  const { isSessionActive, totalTime, activeTime, restTime, summary, cancel } = useWorkout();
  const location = useLocation();

  if (!isSessionActive) return null;
  if (location.pathname === '/workout-in-progress') return null;

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>Workout in Progress</div>
      <div className={styles.content}>
        <div className={styles.metric}><span>Total</span><strong>{formatTime(totalTime)}</strong></div>
        <div className={styles.metric}><span>Active</span><strong style={{color:'#86efac'}}>{formatTime(activeTime)}</strong></div>
        <div className={styles.metric}><span>Rest</span><strong style={{color:'#fbbf24'}}>{formatTime(restTime)}</strong></div>
        <div>
          <div className={styles.hint}>Summary</div>
          <div style={{color:'#e8ecff', fontWeight:700}}>
            {summary.lastExerciseName ? `Last: ${summary.lastExerciseName}` : `${summary.exerciseCount} exercises, ${summary.setCount} sets`}
          </div>
        </div>
      </div>
      <div className={styles.actions}>
        <button className={styles.primaryBtn} onClick={() => navigate('/workout-in-progress')}>Resume Workout</button>
        <button className={styles.dangerBtn} onClick={cancel}>Cancel Session</button>
      </div>
    </aside>
  );
}
