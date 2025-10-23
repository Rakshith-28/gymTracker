import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

const WorkoutContext = createContext(null);

export function WorkoutProvider({ children }) {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [phase, setPhase] = useState('idle'); // 'idle' | 'exercise' | 'rest'
  const [totalTime, setTotalTime] = useState(0);
  const [activeTime, setActiveTime] = useState(0);
  const [restTime, setRestTime] = useState(0);

  const timerRef = useRef(null);

  // Global ticking timer, persists across route changes
  useEffect(() => {
    if (!isSessionActive) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    if (timerRef.current) return;
    timerRef.current = setInterval(() => {
      setTotalTime((t) => t + 1);
      if (phase === 'exercise') setActiveTime((a) => a + 1);
      else if (phase === 'rest') setRestTime((r) => r + 1);
    }, 1000);
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isSessionActive, phase]);

  const start = () => {
    setIsSessionActive(true);
    // Don't reset timers on start; assume a fresh session will reset explicitly
  };

  const stop = () => {
    setIsSessionActive(false);
  };

  const reset = () => {
    setTotalTime(0);
    setActiveTime(0);
    setRestTime(0);
    setPhase('idle');
  };

  const value = useMemo(() => ({
    // state
    isSessionActive,
    phase,
    totalTime,
    activeTime,
    restTime,
    // controls
    start,
    stop,
    reset,
    setPhase,
    setTotalTime,
    setActiveTime,
    setRestTime,
  }), [isSessionActive, phase, totalTime, activeTime, restTime]);

  return (
    <WorkoutContext.Provider value={value}>{children}</WorkoutContext.Provider>
  );
}

export function useWorkout() {
  const ctx = useContext(WorkoutContext);
  if (!ctx) throw new Error('useWorkout must be used within a WorkoutProvider');
  return ctx;
}
