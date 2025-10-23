 const mongoose = require('mongoose');

const preferencesSchema = new mongoose.Schema({
  theme: {
    type: String,
    enum: ['light', 'dark'],
    default: 'light'
  },
  weightUnit: {
    type: String,
    enum: ['kg', 'lbs'],
    default: 'kg'
  }
}, { _id: false });

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  // Profile fields
  age: { type: Number, min: 0 },
  gender: { type: String, enum: ['male', 'female', 'other', 'prefer_not_to_say'], default: 'prefer_not_to_say' },
  heightCm: { type: Number, min: 0 },
  weightKg: { type: Number, min: 0 },
  bio: { type: String, maxlength: 500 },
  profilePicture: { type: String }, // URL or base64 string
  country: { type: String, default: '' },
  unitSystem: { type: String, enum: ['metric', 'imperial'], default: 'metric' },
  preferences: { type: preferencesSchema, default: () => ({}) }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);

