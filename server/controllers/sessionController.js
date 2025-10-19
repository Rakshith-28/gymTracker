 const WorkoutSession = require('../models/WorkoutSession');

// Start a new session
exports.startSession = async (req, res) => {
  try {
    const { templateId } = req.body;
    
    const session = await WorkoutSession.create({
      userId: req.user.id,
      startTime: new Date(),
      exercises: [],
      templateId: templateId || null
    });
    
    res.status(201).json(session);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update session (add exercise, add set, etc.)
exports.updateSession = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const session = await WorkoutSession.findById(id);
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    if (session.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    // Update session with provided data
    Object.assign(session, updateData);
    await session.save();
    
    res.json(session);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Finish session
exports.finishSession = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes, feeling } = req.body;
    
    const session = await WorkoutSession.findById(id);
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    if (session.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    // Calculate total volume
    const totalVolume = session.exercises.reduce((sum, exercise) => {
      return sum + exercise.sets.reduce((exSum, set) => {
        return exSum + (set.reps * set.weight);
      }, 0);
    }, 0);
    
    session.endTime = new Date();
    session.notes = notes;
    session.feeling = feeling;
    session.totalVolume = totalVolume;
    
    await session.save();
    
    res.json(session);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all sessions
exports.getSessions = async (req, res) => {
  try {
    const sessions = await WorkoutSession.find({ userId: req.user.id })
      .sort({ startTime: -1 });
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single session
exports.getSessionById = async (req, res) => {
  try {
    const session = await WorkoutSession.findById(req.params.id);
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    if (session.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    res.json(session);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete session
exports.deleteSession = async (req, res) => {
  try {
    const session = await WorkoutSession.findById(req.params.id);
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    if (session.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    await WorkoutSession.findByIdAndDelete(req.params.id);
    res.json({ message: 'Session deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
