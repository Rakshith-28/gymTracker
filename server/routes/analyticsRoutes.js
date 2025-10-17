 
const express = require('express');
const {
  getPersonalRecords,
  getVolumeProgress,
  getStrengthProgress,
  getWorkoutFrequency,
  getMuscleGroupDistribution
} = require('../controllers/analyticsController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes are protected
router.get('/prs', protect, getPersonalRecords);
router.get('/volume/:exerciseName', protect, getVolumeProgress);
router.get('/strength/:exerciseName', protect, getStrengthProgress);
router.get('/frequency', protect, getWorkoutFrequency);
router.get('/muscle-distribution', protect, getMuscleGroupDistribution);

module.exports = router;