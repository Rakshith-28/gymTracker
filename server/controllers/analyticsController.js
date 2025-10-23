const WorkoutSession = require('../models/WorkoutSession');

// Helper function to convert seconds to minutes
const secondsToMinutes = (seconds) => Math.round(seconds / 60);

// Get Personal Records (PRs) for each exercise
exports.getPersonalRecords = async (req, res) => {
  try {
    const sessions = await WorkoutSession.find({ userId: req.user.id });
    
    const prs = {};
    
    sessions.forEach(session => {
      session.exercises.forEach(exercise => {
        const exerciseName = exercise.name;
        
        exercise.sets.forEach(set => {
          if (!set.weight || !set.reps) return;
          
          // Calculate one-rep max estimate (Brzycki formula)
          const oneRepMax = set.weight * (36 / (37 - set.reps));
          
          if (!prs[exerciseName] || oneRepMax > prs[exerciseName].oneRepMax) {
            prs[exerciseName] = {
              weight: set.weight,
              reps: set.reps,
              oneRepMax: Math.round(oneRepMax),
              date: session.startTime,
              workoutId: session._id
            };
          }
        });
      });
    });
    
    res.json(prs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get total volume for specific exercise over time
exports.getVolumeProgress = async (req, res) => {
  try {
    const { exerciseName } = req.params;
    const { days } = req.query;
    
    const daysBack = days ? parseInt(days) : 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    
    const sessions = await WorkoutSession.find({
      userId: req.user.id,
      startTime: { $gte: startDate },
      'exercises.name': exerciseName
    }).sort({ startTime: 1 });
    
    const volumeData = sessions.map(session => {
      const exercise = session.exercises.find(ex => ex.name === exerciseName);
      
      // Calculate total volume (weight × reps for all sets)
      const totalVolume = exercise.sets.reduce((sum, set) => {
        return sum + (set.weight * set.reps);
      }, 0);
      
      return {
        date: session.startTime,
        volume: totalVolume,
        sets: exercise.sets.length
      };
    });
    
    res.json(volumeData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get strength progress (max weight) for exercise over time
exports.getStrengthProgress = async (req, res) => {
  try {
    const { exerciseName } = req.params;
    
    const sessions = await WorkoutSession.find({
      userId: req.user.id,
      'exercises.name': exerciseName
    }).sort({ startTime: 1 });
    
    const strengthData = sessions.map(session => {
      const exercise = session.exercises.find(ex => ex.name === exerciseName);
      
      // Find max weight used in this workout
      const maxWeight = Math.max(...exercise.sets.map(set => set.weight || 0));
      
      // Find the set with max weight
      const maxSet = exercise.sets.find(set => set.weight === maxWeight);
      
      return {
        date: session.startTime,
        maxWeight: maxWeight,
        reps: maxSet ? maxSet.reps : 0
      };
    });
    
    res.json(strengthData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get workout frequency (workouts per week over time)
exports.getWorkoutFrequency = async (req, res) => {
  try {
    const { weeks } = req.query;
    const weeksBack = weeks ? parseInt(weeks) : 12;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (weeksBack * 7));
    
    const sessions = await WorkoutSession.find({
      userId: req.user.id,
      startTime: { $gte: startDate }
    }).sort({ startTime: 1 });
    
    // Group by week
    const weeklyData = {};
    
    sessions.forEach(session => {
      const date = new Date(session.startTime);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
      const weekKey = weekStart.toISOString().split('T')[0];
      
      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = {
          weekStart: weekKey,
          count: 0,
          totalDuration: 0
        };
      }
      
      weeklyData[weekKey].count++;
      weeklyData[weekKey].totalDuration += secondsToMinutes(session.totalDuration || 0);
    });
    
    const result = Object.values(weeklyData).sort((a, b) => 
      new Date(a.weekStart) - new Date(b.weekStart)
    );
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get muscle group distribution
exports.getMuscleGroupDistribution = async (req, res) => {
  try {
    const { days } = req.query;
    const daysBack = days ? parseInt(days) : 30;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    
    const sessions = await WorkoutSession.find({
      userId: req.user.id,
      startTime: { $gte: startDate }
    });
    
    const muscleGroups = {
      chest: 0,
      back: 0,
      legs: 0,
      shoulders: 0,
      arms: 0,
      core: 0
    };
    
    sessions.forEach(session => {
      session.exercises.forEach(exercise => {
        const name = exercise.name.toLowerCase();
        
        if (name.includes('bench') || name.includes('chest') || name.includes('push')) {
          muscleGroups.chest++;
        } else if (name.includes('pull') || name.includes('row') || name.includes('back')) {
          muscleGroups.back++;
        } else if (name.includes('squat') || name.includes('leg') || name.includes('lunge')) {
          muscleGroups.legs++;
        } else if (name.includes('shoulder') || name.includes('press') || name.includes('raise')) {
          muscleGroups.shoulders++;
        } else if (name.includes('curl') || name.includes('tricep') || name.includes('arm')) {
          muscleGroups.arms++;
        } else if (name.includes('plank') || name.includes('crunch') || name.includes('core')) {
          muscleGroups.core++;
        }
      });
    });
    
    res.json(muscleGroups);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Activity calendar and streaks
exports.getActivitySummary = async (req, res) => {
  try {
    // Optional query: days (default 365)
    const { days } = req.query;
    const daysBack = days ? parseInt(days) : 365;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const sessions = await WorkoutSession.find({
      userId: req.user.id,
      startTime: { $gte: startDate }
    }).sort({ startTime: 1 });

    // Collect unique workout days (YYYY-MM-DD)
    const daySet = new Set();
    sessions.forEach(s => {
      const d = new Date(s.startTime);
      const key = d.toISOString().split('T')[0];
      daySet.add(key);
    });
    const daysWithWorkouts = Array.from(daySet).sort();

    // Compute current and best streaks
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const hasDay = (date) => daySet.has(date.toISOString().split('T')[0]);

    // Current streak (consecutive days up to today)
    let currentStreak = 0;
    for (let i = 0; ; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      if (hasDay(d)) currentStreak++; else break;
    }

    // Best streak by scanning backward over range
    let bestStreak = 0;
    let streak = 0;
    // Build an ordered list of all dates in range
    const allDates = [];
    const cursor = new Date(today);
    for (let i = 0; i <= daysBack; i++) {
      const d = new Date(cursor);
      d.setDate(cursor.getDate() - i);
      allDates.push(d);
    }
    allDates.forEach(d => {
      if (hasDay(d)) {
        streak++;
        if (streak > bestStreak) bestStreak = streak;
      } else {
        streak = 0;
      }
    });

    res.json({
      days: daysWithWorkouts,
      currentStreak,
      bestStreak
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};