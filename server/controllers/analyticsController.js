 
const Workout = require('../models/Workout');

// Get Personal Records (PRs) for each exercise
exports.getPersonalRecords = async (req, res) => {
  try {
    const workouts = await Workout.find({ userId: req.user.id });
    
    const prs = {};
    
    workouts.forEach(workout => {
      workout.exercises.forEach(exercise => {
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
              date: workout.date,
              workoutId: workout._id
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
    const { days } = req.query; // Number of days to look back
    
    const daysBack = days ? parseInt(days) : 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    
    const workouts = await Workout.find({
      userId: req.user.id,
      date: { $gte: startDate },
      'exercises.name': exerciseName
    }).sort({ date: 1 });
    
    const volumeData = workouts.map(workout => {
      const exercise = workout.exercises.find(ex => ex.name === exerciseName);
      
      // Calculate total volume (weight × reps for all sets)
      const totalVolume = exercise.sets.reduce((sum, set) => {
        return sum + (set.weight * set.reps);
      }, 0);
      
      return {
        date: workout.date,
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
    
    const workouts = await Workout.find({
      userId: req.user.id,
      'exercises.name': exerciseName
    }).sort({ date: 1 });
    
    const strengthData = workouts.map(workout => {
      const exercise = workout.exercises.find(ex => ex.name === exerciseName);
      
      // Find max weight used in this workout
      const maxWeight = Math.max(...exercise.sets.map(set => set.weight || 0));
      
      // Find the set with max weight
      const maxSet = exercise.sets.find(set => set.weight === maxWeight);
      
      return {
        date: workout.date,
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
    
    const workouts = await Workout.find({
      userId: req.user.id,
      date: { $gte: startDate }
    }).sort({ date: 1 });
    
    // Group by week
    const weeklyData = {};
    
    workouts.forEach(workout => {
      const date = new Date(workout.date);
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
      weeklyData[weekKey].totalDuration += workout.duration || 0;
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
    
    const workouts = await Workout.find({
      userId: req.user.id,
      date: { $gte: startDate }
    });
    
    const muscleGroups = {
      chest: 0,
      back: 0,
      legs: 0,
      shoulders: 0,
      arms: 0,
      core: 0
    };
    
    // This is simplified - ideally you'd reference Exercise model for categories
    workouts.forEach(workout => {
      workout.exercises.forEach(exercise => {
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