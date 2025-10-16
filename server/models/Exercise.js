 
const mongoose = require('mongoose');

const exerciseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'cardio', 'other']
  },
  equipment: {
    type: String,
    enum: ['barbell', 'dumbbell', 'machine', 'bodyweight', 'cable', 'other']
  },
  muscleGroup: {
    type: [String]  // Can target multiple muscles
  },
  instructions: {
    type: String
  },
  isCustom: {
    type: Boolean,
    default: false
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    // Only required if custom exercise
    required: function() { return this.isCustom; }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Exercise', exerciseSchema);