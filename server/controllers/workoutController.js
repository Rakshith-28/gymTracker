 
const Workout = require('../models/Workout');

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