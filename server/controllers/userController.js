 const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Get user profile
exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update user profile - supports basic fields, profile details, preferences
exports.updateUserProfile = async (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ message: 'Invalid request body' });
    }
    const {
      name,
      email,
      age,
      gender,
      heightCm,
      weightKg,
      weight,
      weightUnit,
      bio,
      profilePicture,
      country,
      unitSystem,
      preferences
    } = req.body || {};
    
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if email is already taken by another user
    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({ message: 'Email already in use' });
      }
    }
    
    // Assign basics
    if (name) user.name = name;
    if (email) user.email = email;
    
    // Profile details
    if (typeof age !== 'undefined') user.age = age;
    if (typeof gender !== 'undefined') user.gender = gender;
    if (typeof heightCm !== 'undefined') user.heightCm = heightCm;

    // Weight handling - allow either weightKg directly or weight with unit
    if (typeof weightKg !== 'undefined') {
      user.weightKg = weightKg;
    } else if (typeof weight !== 'undefined' && weightUnit) {
      const kg = weightUnit === 'lbs' ? Number(weight) * 0.45359237 : Number(weight);
      user.weightKg = Math.round(kg * 100) / 100;
      user.preferences = {
        ...(user.preferences || {}),
        weightUnit: weightUnit
      };
    }

    if (typeof bio !== 'undefined') user.bio = bio;
    if (typeof profilePicture !== 'undefined') user.profilePicture = profilePicture;
    if (typeof country !== 'undefined') user.country = country;
    if (typeof unitSystem !== 'undefined') user.unitSystem = unitSystem;

    // Preferences block (theme, weightUnit)
    if (preferences && typeof preferences === 'object') {
      user.preferences = {
        ...(user.preferences || {}),
        ...(preferences.theme ? { theme: preferences.theme } : {}),
        ...(preferences.weightUnit ? { weightUnit: preferences.weightUnit } : {})
      };
    }
    
    await user.save();
    
    const sanitized = await User.findById(user._id).select('-password');
    res.json(sanitized);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Change password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Please provide current and new password' });
    }
    
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    
    await user.save();
    
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete user account
exports.deleteUserAccount = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    await User.findByIdAndDelete(req.user.id);
    
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
