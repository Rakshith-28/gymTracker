 
const Workout = require('../models/Workout');
const mongoose = require('mongoose');

// Create new workout
exports.createWorkout = async (req, res) => {
  try {
    const { exercises, notes, duration, date } = req.body;
    
    const workout = await Workout.create({
      userId: req.user.id,  // From auth middleware
      exercises,
      notes,
      duration,
      date: date || Date.now()
    });

    res.status(201).json(workout);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all user workouts
exports.getWorkouts = async (req, res) => {
  try {
    const workouts = await Workout.find({ userId: req.user.id }).sort({ date: -1 });
    res.json(workouts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single workout
exports.getWorkoutById = async (req, res) => {
  try {
    const workout = await Workout.findById(req.params.id);
    
    if (!workout) {
      return res.status(404).json({ message: 'Workout not found' });
    }
    
    // Check ownership
    if (workout.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    res.json(workout);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update workout
exports.updateWorkout = async (req, res) => {
  try {
    const workout = await Workout.findById(req.params.id);
    
    if (!workout) {
      return res.status(404).json({ message: 'Workout not found' });
    }
    
    // Check ownership
    if (workout.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    const updatedWorkout = await Workout.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    
    res.json(updatedWorkout);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete workout
exports.deleteWorkout = async (req, res) => {
  try {
    const workout = await Workout.findById(req.params.id);
    
    if (!workout) {
      return res.status(404).json({ message: 'Workout not found' });
    }
    
    // Check ownership
    if (workout.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    await Workout.findByIdAndDelete(req.params.id);
    res.json({ message: 'Workout deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get workouts by date range
exports.getWorkoutsByDateRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let query = { userId: req.user.id };
    
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }
    
    const workouts = await Workout.find(query).sort({ date: -1 });
    res.json(workouts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get workout history for specific exercise
exports.getExerciseHistory = async (req, res) => {
  try {
    const { exerciseName } = req.params;
    
    const workouts = await Workout.find({
      userId: req.user.id,
      'exercises.name': exerciseName
    }).sort({ date: -1 });
    
    // Extract only the specific exercise from each workout
    const exerciseHistory = workouts.map(workout => ({
      date: workout.date,
      workoutId: workout._id,
      exercise: workout.exercises.find(ex => ex.name === exerciseName)
    }));
    
    res.json(exerciseHistory);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get workout stats (total workouts, total exercises, etc.)
exports.getWorkoutStats = async (req, res) => {
  try {
    const workouts = await Workout.find({ userId: req.user.id });
    
    const totalWorkouts = workouts.length;
    const totalExercises = workouts.reduce((sum, workout) => sum + workout.exercises.length, 0);
    const totalDuration = workouts.reduce((sum, workout) => sum + (workout.duration || 0), 0);
    
    // Find most recent workout
    const recentWorkout = workouts.length > 0 ? workouts[0].date : null;
    
    // Count exercises done
    const exerciseCount = {};
    workouts.forEach(workout => {
      workout.exercises.forEach(exercise => {
        exerciseCount[exercise.name] = (exerciseCount[exercise.name] || 0) + 1;
      });
    });
    
    res.json({
      totalWorkouts,
      totalExercises,
      totalDuration,
      recentWorkout,
      exerciseCount,
      averageDuration: totalWorkouts > 0 ? Math.round(totalDuration / totalWorkouts) : 0
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get workouts grouped by month
exports.getWorkoutsByMonth = async (req, res) => {
  try {
    const { year } = req.query;
    const targetYear = year ? parseInt(year) : new Date().getFullYear();
    
    const workouts = await Workout.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(req.user.id),
          date: {
            $gte: new Date(`${targetYear}-01-01`),
            $lt: new Date(`${targetYear + 1}-01-01`)
          }
        }
      },
      {
        $group: {
          _id: { $month: '$date' },
          count: { $sum: 1 },
          totalDuration: { $sum: '$duration' }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);
    
    res.json(workouts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};