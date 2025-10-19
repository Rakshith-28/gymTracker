 const WorkoutTemplate = require('../models/WorkoutTemplate');

// Create template
exports.createTemplate = async (req, res) => {
  try {
    const { name, exercises } = req.body;
    
    const template = await WorkoutTemplate.create({
      userId: req.user.id,
      name,
      exercises
    });
    
    res.status(201).json(template);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all user templates
exports.getTemplates = async (req, res) => {
  try {
    const templates = await WorkoutTemplate.find({ userId: req.user.id })
      .sort({ createdAt: -1 });
    res.json(templates);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single template
exports.getTemplateById = async (req, res) => {
  try {
    const template = await WorkoutTemplate.findById(req.params.id);
    
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    
    if (template.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    res.json(template);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update template
exports.updateTemplate = async (req, res) => {
  try {
    const template = await WorkoutTemplate.findById(req.params.id);
    
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    
    if (template.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    const updatedTemplate = await WorkoutTemplate.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    
    res.json(updatedTemplate);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete template
exports.deleteTemplate = async (req, res) => {
  try {
    const template = await WorkoutTemplate.findById(req.params.id);
    
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    
    if (template.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    await WorkoutTemplate.findByIdAndDelete(req.params.id);
    res.json({ message: 'Template deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
