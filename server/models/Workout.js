 
const mongoose = require('mongoose');

const workoutSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  exercises: [{
    name: {
      type: String,
      required: true
    },
    sets: [{
      reps: Number,
      weight: Number
    }]
  }],
  notes: {
    type: String
  },
  duration: {
    type: Number  // in minutes
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Workout', workoutSchema);