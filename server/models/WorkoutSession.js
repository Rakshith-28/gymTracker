 
const mongoose = require('mongoose');

const workoutSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date
  },
  totalDuration: {
    type: Number  // in seconds
  },
  totalActiveDuration: {
    type: Number  // in seconds
  },
  totalRestDuration: {
    type: Number  // in seconds
  },
  exercises: [{
    name: {
      type: String,
      required: true
    },
    startTime: {
      type: Date,
      required: true
    },
    endTime: {
      type: Date
    },
    duration: {
      type: Number  // in seconds
    },
    sets: [{
      reps: {
        type: Number,
        required: true
      },
      weight: {
        type: Number,
        required: true
      },
      timestamp: {
        type: Date,
        default: Date.now
      }
    }],
    notes: {
      type: String
    },
    confidence: {
      type: Number,
      min: 1,
      max: 5
    },
    restAfter: {
      type: Number  // in seconds
    }
  }],
  notes: {
    type: String
  },
  feeling: {
    type: Number,
    min: 1,
    max: 5
  },
  totalVolume: {
    type: Number
  },
  templateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkoutTemplate'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('WorkoutSession', workoutSessionSchema);