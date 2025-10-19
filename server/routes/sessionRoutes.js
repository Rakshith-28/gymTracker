 const express = require('express');
const {
  startSession,
  updateSession,
  finishSession,
  getSessions,
  getSessionById,
  deleteSession
} = require('../controllers/sessionController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/start', protect, startSession);
router.get('/', protect, getSessions);
router.get('/:id', protect, getSessionById);
router.put('/:id', protect, updateSession);
router.post('/:id/finish', protect, finishSession);
router.delete('/:id', protect, deleteSession);

module.exports = router;
