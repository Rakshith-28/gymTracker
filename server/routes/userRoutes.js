 
const express = require('express');
const {
  getUserProfile,
  updateUserProfile,
  changePassword,
  deleteUserAccount
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes are protected
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile);
router.put('/change-password', protect, changePassword);
router.delete('/account', protect, deleteUserAccount);

module.exports = router;