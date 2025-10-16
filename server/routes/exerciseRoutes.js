 
const express = require('express');
const {
  getExercises,
  getExerciseById,
  createExercise,
  updateExercise,
  deleteExercise
} = require('../controllers/exerciseController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes are protected
router.get('/', protect, getExercises);
router.get('/:id', protect, getExerciseById);
router.post('/', protect, createExercise);
router.put('/:id', protect, updateExercise);
router.delete('/:id', protect, deleteExercise);

module.exports = router;