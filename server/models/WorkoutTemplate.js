 
const mongoose = require('mongoose');

const workoutTemplateSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  exercises: [{
    name: {
      type: String,
      required: true
    },
    targetSets: {
      type: Number
    },
    targetReps: {
      type: Number
    },
    targetWeight: {
      type: Number
    }
  }],
  isPublic: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('WorkoutTemplate', workoutTemplateSchema);