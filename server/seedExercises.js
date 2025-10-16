 
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Exercise = require('./models/Exercise');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const defaultExercises = [
  // Chest
  { name: 'Bench Press', category: 'chest', equipment: 'barbell', muscleGroup: ['chest', 'triceps'], isCustom: false },
  { name: 'Incline Dumbbell Press', category: 'chest', equipment: 'dumbbell', muscleGroup: ['chest', 'shoulders'], isCustom: false },
  { name: 'Push-ups', category: 'chest', equipment: 'bodyweight', muscleGroup: ['chest', 'triceps'], isCustom: false },
  { name: 'Chest Fly', category: 'chest', equipment: 'dumbbell', muscleGroup: ['chest'], isCustom: false },
  
  // Back
  { name: 'Deadlift', category: 'back', equipment: 'barbell', muscleGroup: ['back', 'legs', 'core'], isCustom: false },
  { name: 'Pull-ups', category: 'back', equipment: 'bodyweight', muscleGroup: ['back', 'biceps'], isCustom: false },
  { name: 'Barbell Row', category: 'back', equipment: 'barbell', muscleGroup: ['back', 'biceps'], isCustom: false },
  { name: 'Lat Pulldown', category: 'back', equipment: 'machine', muscleGroup: ['back', 'biceps'], isCustom: false },
  
  // Legs
  { name: 'Squat', category: 'legs', equipment: 'barbell', muscleGroup: ['quads', 'glutes'], isCustom: false },
  { name: 'Leg Press', category: 'legs', equipment: 'machine', muscleGroup: ['quads', 'glutes'], isCustom: false },
  { name: 'Lunges', category: 'legs', equipment: 'dumbbell', muscleGroup: ['quads', 'glutes'], isCustom: false },
  { name: 'Leg Curl', category: 'legs', equipment: 'machine', muscleGroup: ['hamstrings'], isCustom: false },
  { name: 'Calf Raise', category: 'legs', equipment: 'machine', muscleGroup: ['calves'], isCustom: false },
  
  // Shoulders
  { name: 'Overhead Press', category: 'shoulders', equipment: 'barbell', muscleGroup: ['shoulders', 'triceps'], isCustom: false },
  { name: 'Lateral Raise', category: 'shoulders', equipment: 'dumbbell', muscleGroup: ['shoulders'], isCustom: false },
  { name: 'Front Raise', category: 'shoulders', equipment: 'dumbbell', muscleGroup: ['shoulders'], isCustom: false },
  
  // Arms
  { name: 'Barbell Curl', category: 'arms', equipment: 'barbell', muscleGroup: ['biceps'], isCustom: false },
  { name: 'Tricep Dips', category: 'arms', equipment: 'bodyweight', muscleGroup: ['triceps'], isCustom: false },
  { name: 'Hammer Curl', category: 'arms', equipment: 'dumbbell', muscleGroup: ['biceps'], isCustom: false },
  { name: 'Tricep Extension', category: 'arms', equipment: 'dumbbell', muscleGroup: ['triceps'], isCustom: false },
  
  // Core
  { name: 'Plank', category: 'core', equipment: 'bodyweight', muscleGroup: ['core'], isCustom: false },
  { name: 'Crunches', category: 'core', equipment: 'bodyweight', muscleGroup: ['abs'], isCustom: false },
  { name: 'Russian Twists', category: 'core', equipment: 'bodyweight', muscleGroup: ['abs', 'obliques'], isCustom: false },
];

const seedExercises = async () => {
  try {
    // Delete existing default exercises
    await Exercise.deleteMany({ isCustom: false });
    
    // Insert new default exercises
    await Exercise.insertMany(defaultExercises);
    
    console.log('Default exercises seeded successfully!');
    process.exit();
  } catch (error) {
    console.error('Error seeding exercises:', error);
    process.exit(1);
  }
};

seedExercises();