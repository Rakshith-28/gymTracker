const express = require('express');
const {
  createWorkout,
  getWorkouts,
  getWorkoutById,
  updateWorkout,
  deleteWorkout,
  getWorkoutsByDateRange,
  getExerciseHistory,
  getWorkoutStats,
  getWorkoutsByMonth
} = require('../controllers/workoutController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes are protected (require authentication)
router.post('/', protect, createWorkout);
router.get('/', protect, getWorkouts);
router.get('/stats', protect, getWorkoutStats);  // Must be before /:id
router.get('/date-range', protect, getWorkoutsByDateRange);
router.get('/by-month', protect, getWorkoutsByMonth);
router.get('/exercise/:exerciseName', protect, getExerciseHistory);
router.get('/:id', protect, getWorkoutById);
router.put('/:id', protect, updateWorkout);
router.delete('/:id', protect, deleteWorkout);

module.exports = router;