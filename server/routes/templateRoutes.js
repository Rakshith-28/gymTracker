 const express = require('express');
const {
  createTemplate,
  getTemplates,
  getTemplateById,
  updateTemplate,
  deleteTemplate
} = require('../controllers/templateController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', protect, createTemplate);
router.get('/', protect, getTemplates);
router.get('/:id', protect, getTemplateById);
router.put('/:id', protect, updateTemplate);
router.delete('/:id', protect, deleteTemplate);

module.exports = router;
