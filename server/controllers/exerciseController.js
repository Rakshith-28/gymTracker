 
const Exercise = require('../models/Exercise');

// Get all exercises (default + user's custom)
exports.getExercises = async (req, res) => {
  try {
    const { category, search } = req.query;
    
    let query = {
      $or: [
        { isCustom: false },  // Default exercises
        { userId: req.user.id }  // User's custom exercises
      ]
    };
    
    // Filter by category
    if (category) {
      query.category = category;
    }
    
    // Search by name
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    
    const exercises = await Exercise.find(query).sort({ name: 1 });
    res.json(exercises);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single exercise
exports.getExerciseById = async (req, res) => {
  try {
    const exercise = await Exercise.findById(req.params.id);
    
    if (!exercise) {
      return res.status(404).json({ message: 'Exercise not found' });
    }
    
    res.json(exercise);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create custom exercise
exports.createExercise = async (req, res) => {
  try {
    const { name, category, equipment, muscleGroup, instructions } = req.body;
    
    const exercise = await Exercise.create({
      name,
      category,
      equipment,
      muscleGroup,
      instructions,
      isCustom: true,
      userId: req.user.id
    });
    
    res.status(201).json(exercise);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update custom exercise
exports.updateExercise = async (req, res) => {
  try {
    const exercise = await Exercise.findById(req.params.id);
    
    if (!exercise) {
      return res.status(404).json({ message: 'Exercise not found' });
    }
    
    // Only owner can update custom exercises
    if (exercise.isCustom && exercise.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    // Can't update default exercises
    if (!exercise.isCustom) {
      return res.status(403).json({ message: 'Cannot update default exercises' });
    }
    
    const updatedExercise = await Exercise.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    
    res.json(updatedExercise);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete custom exercise
exports.deleteExercise = async (req, res) => {
  try {
    const exercise = await Exercise.findById(req.params.id);
    
    if (!exercise) {
      return res.status(404).json({ message: 'Exercise not found' });
    }
    
    // Only owner can delete custom exercises
    if (exercise.isCustom && exercise.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    // Can't delete default exercises
    if (!exercise.isCustom) {
      return res.status(403).json({ message: 'Cannot delete default exercises' });
    }
    
    await Exercise.findByIdAndDelete(req.params.id);
    res.json({ message: 'Exercise deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};