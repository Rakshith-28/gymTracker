 
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
  { name: 'Decline Bench Press', category: 'chest', equipment: 'barbell', muscleGroup: ['chest', 'triceps'], isCustom: false },
  { name: 'Cable Chest Fly', category: 'chest', equipment: 'cable', muscleGroup: ['chest'], isCustom: false },
  { name: 'Machine Chest Press', category: 'chest', equipment: 'machine', muscleGroup: ['chest', 'triceps'], isCustom: false },
  { name: 'Pec Deck (Machine Fly)', category: 'chest', equipment: 'machine', muscleGroup: ['chest'], isCustom: false },
  { name: 'Decline Dumbbell Press', category: 'chest', equipment: 'dumbbell', muscleGroup: ['chest', 'triceps'], isCustom: false },
  { name: 'Cable Crossover (High to Low)', category: 'chest', equipment: 'cable', muscleGroup: ['chest'], isCustom: false },
  
  // Back
  { name: 'Deadlift', category: 'back', equipment: 'barbell', muscleGroup: ['back', 'legs', 'core'], isCustom: false },
  { name: 'Pull-ups', category: 'back', equipment: 'bodyweight', muscleGroup: ['back', 'biceps'], isCustom: false },
  { name: 'Barbell Row', category: 'back', equipment: 'barbell', muscleGroup: ['back', 'biceps'], isCustom: false },
  { name: 'Lat Pulldown', category: 'back', equipment: 'machine', muscleGroup: ['back', 'biceps'], isCustom: false },
  { name: 'Seated Cable Row', category: 'back', equipment: 'cable', muscleGroup: ['back', 'biceps'], isCustom: false },
  { name: 'T-Bar Row', category: 'back', equipment: 'barbell', muscleGroup: ['back', 'biceps'], isCustom: false },
  { name: 'Single-Arm Dumbbell Row', category: 'back', equipment: 'dumbbell', muscleGroup: ['back', 'biceps'], isCustom: false },
  { name: 'Face Pull', category: 'back', equipment: 'cable', muscleGroup: ['rear delts', 'upper back'], isCustom: false },
  { name: 'Chest-Supported Row', category: 'back', equipment: 'machine', muscleGroup: ['back', 'upper back', 'lats'], isCustom: false },
  { name: 'Pendlay Row', category: 'back', equipment: 'barbell', muscleGroup: ['back', 'lats'], isCustom: false },
  { name: 'Wide-Grip Pull-up', category: 'back', equipment: 'bodyweight', muscleGroup: ['lats', 'upper back'], isCustom: false },
  { name: 'Straight-Arm Pulldown', category: 'back', equipment: 'cable', muscleGroup: ['lats'], isCustom: false },
  
  // Legs
  { name: 'Squat', category: 'legs', equipment: 'barbell', muscleGroup: ['quads', 'glutes'], isCustom: false },
  { name: 'Leg Press', category: 'legs', equipment: 'machine', muscleGroup: ['quads', 'glutes'], isCustom: false },
  { name: 'Lunges', category: 'legs', equipment: 'dumbbell', muscleGroup: ['quads', 'glutes'], isCustom: false },
  { name: 'Leg Curl', category: 'legs', equipment: 'machine', muscleGroup: ['hamstrings'], isCustom: false },
  { name: 'Calf Raise', category: 'legs', equipment: 'machine', muscleGroup: ['calves'], isCustom: false },
  { name: 'Romanian Deadlift', category: 'legs', equipment: 'barbell', muscleGroup: ['hamstrings', 'glutes'], isCustom: false },
  { name: 'Bulgarian Split Squat', category: 'legs', equipment: 'dumbbell', muscleGroup: ['quads', 'glutes'], isCustom: false },
  { name: 'Leg Extension', category: 'legs', equipment: 'machine', muscleGroup: ['quads'], isCustom: false },
  { name: 'Hip Thrust', category: 'legs', equipment: 'barbell', muscleGroup: ['glutes', 'hamstrings'], isCustom: false },
  { name: 'Glute Bridge', category: 'legs', equipment: 'bodyweight', muscleGroup: ['glutes'], isCustom: false },
  { name: 'Hack Squat', category: 'legs', equipment: 'machine', muscleGroup: ['quads', 'glutes'], isCustom: false },
  { name: 'Smith Machine Squat', category: 'legs', equipment: 'machine', muscleGroup: ['quads', 'glutes'], isCustom: false },
  { name: 'Seated Leg Curl', category: 'legs', equipment: 'machine', muscleGroup: ['hamstrings'], isCustom: false },
  { name: 'Standing Calf Raise', category: 'legs', equipment: 'machine', muscleGroup: ['calves'], isCustom: false },
  { name: 'Seated Calf Raise', category: 'legs', equipment: 'machine', muscleGroup: ['calves'], isCustom: false },
  { name: 'Nordic Hamstring Curl', category: 'legs', equipment: 'other', muscleGroup: ['hamstrings'], isCustom: false },
  
  // Shoulders
  { name: 'Overhead Press', category: 'shoulders', equipment: 'barbell', muscleGroup: ['shoulders', 'triceps'], isCustom: false },
  { name: 'Lateral Raise', category: 'shoulders', equipment: 'dumbbell', muscleGroup: ['shoulders'], isCustom: false },
  { name: 'Front Raise', category: 'shoulders', equipment: 'dumbbell', muscleGroup: ['shoulders'], isCustom: false },
  { name: 'Seated Dumbbell Press', category: 'shoulders', equipment: 'dumbbell', muscleGroup: ['shoulders', 'triceps'], isCustom: false },
  { name: 'Rear Delt Fly', category: 'shoulders', equipment: 'dumbbell', muscleGroup: ['rear delts'], isCustom: false },
  { name: 'Arnold Press', category: 'shoulders', equipment: 'dumbbell', muscleGroup: ['shoulders'], isCustom: false },
  { name: 'Upright Row', category: 'shoulders', equipment: 'barbell', muscleGroup: ['shoulders', 'traps'], isCustom: false },
  { name: 'Cable Lateral Raise', category: 'shoulders', equipment: 'cable', muscleGroup: ['deltoids'], isCustom: false },
  { name: 'Reverse Pec Deck', category: 'shoulders', equipment: 'machine', muscleGroup: ['rear delts'], isCustom: false },
  { name: 'Face Pull (Rope)', category: 'shoulders', equipment: 'cable', muscleGroup: ['rear delts', 'upper back'], isCustom: false },
  
  // Arms
  { name: 'Barbell Curl', category: 'arms', equipment: 'barbell', muscleGroup: ['biceps'], isCustom: false },
  { name: 'Tricep Dips', category: 'arms', equipment: 'bodyweight', muscleGroup: ['triceps'], isCustom: false },
  { name: 'Hammer Curl', category: 'arms', equipment: 'dumbbell', muscleGroup: ['biceps'], isCustom: false },
  { name: 'Tricep Extension', category: 'arms', equipment: 'dumbbell', muscleGroup: ['triceps'], isCustom: false },
  { name: 'Preacher Curl', category: 'arms', equipment: 'barbell', muscleGroup: ['biceps'], isCustom: false },
  { name: 'Concentration Curl', category: 'arms', equipment: 'dumbbell', muscleGroup: ['biceps'], isCustom: false },
  { name: 'Skull Crushers', category: 'arms', equipment: 'barbell', muscleGroup: ['triceps'], isCustom: false },
  { name: 'Cable Pushdown', category: 'arms', equipment: 'cable', muscleGroup: ['triceps'], isCustom: false },
  { name: 'Overhead Tricep Extension', category: 'arms', equipment: 'dumbbell', muscleGroup: ['triceps'], isCustom: false },
  { name: 'Incline Dumbbell Curl', category: 'arms', equipment: 'dumbbell', muscleGroup: ['biceps'], isCustom: false },
  { name: 'Cable Bicep Curl (EZ Bar)', category: 'arms', equipment: 'cable', muscleGroup: ['biceps'], isCustom: false },
  { name: 'Close-Grip Bench Press', category: 'arms', equipment: 'barbell', muscleGroup: ['triceps','chest'], isCustom: false },
  { name: 'Rope Pushdown', category: 'arms', equipment: 'cable', muscleGroup: ['triceps'], isCustom: false },
  
  // Core
  { name: 'Plank', category: 'core', equipment: 'bodyweight', muscleGroup: ['core'], isCustom: false },
  { name: 'Crunches', category: 'core', equipment: 'bodyweight', muscleGroup: ['abs'], isCustom: false },
  { name: 'Russian Twists', category: 'core', equipment: 'bodyweight', muscleGroup: ['abs', 'obliques'], isCustom: false },
  { name: 'Hanging Leg Raise', category: 'core', equipment: 'bodyweight', muscleGroup: ['abs', 'hip flexors'], isCustom: false },
  { name: 'Bicycle Crunch', category: 'core', equipment: 'bodyweight', muscleGroup: ['abs', 'obliques'], isCustom: false },
  { name: 'Cable Crunch', category: 'core', equipment: 'cable', muscleGroup: ['abs'], isCustom: false },
  { name: 'Ab Wheel Rollout', category: 'core', equipment: 'other', muscleGroup: ['core'], isCustom: false },
  { name: 'Side Plank', category: 'core', equipment: 'bodyweight', muscleGroup: ['obliques','core'], isCustom: false },
  { name: 'Weighted Crunch', category: 'core', equipment: 'other', muscleGroup: ['abs'], isCustom: false },
  { name: 'Hanging Knee Raise', category: 'core', equipment: 'bodyweight', muscleGroup: ['abs','hip flexors'], isCustom: false },
  { name: 'Pallof Press', category: 'core', equipment: 'cable', muscleGroup: ['obliques','core'], isCustom: false },

  // Glute isolation
  { name: 'Cable Pull-Through', category: 'legs', equipment: 'cable', muscleGroup: ['glutes','hamstrings'], isCustom: false },
  { name: 'Cable Glute Kickback', category: 'legs', equipment: 'cable', muscleGroup: ['glutes'], isCustom: false },

  // Lower back / posterior chain
  { name: 'Good Morning', category: 'back', equipment: 'barbell', muscleGroup: ['hamstrings','lower back','glutes'], isCustom: false },

  // Cardio
  { name: 'Running', category: 'cardio', equipment: 'other', muscleGroup: ['cardio'], isCustom: false },
  { name: 'Cycling', category: 'cardio', equipment: 'machine', muscleGroup: ['cardio'], isCustom: false },
  { name: 'Rowing Machine', category: 'cardio', equipment: 'machine', muscleGroup: ['cardio', 'back'], isCustom: false },
  { name: 'Elliptical', category: 'cardio', equipment: 'machine', muscleGroup: ['cardio'], isCustom: false },
  { name: 'Stair Climber', category: 'cardio', equipment: 'machine', muscleGroup: ['cardio', 'legs'], isCustom: false },
  { name: 'Jump Rope', category: 'cardio', equipment: 'other', muscleGroup: ['cardio'], isCustom: false },
];

const seedExercises = async () => {
  try {
    // Delete existing default exercises
    await Exercise.deleteMany({ isCustom: false });
    // Normalize entries to include primary/secondary and ensure muscleGroup is union
    const normalized = defaultExercises.map(e => {
      const mg = Array.isArray(e.muscleGroup) ? e.muscleGroup : [];
      let primary = e.primaryMuscle;
      let secondary = Array.isArray(e.secondaryMuscles) ? e.secondaryMuscles : [];
      if (!primary) {
        // Heuristic: choose a sensible primary from muscleGroup or category
        const prefOrder = ['chest','back','lats','upper back','shoulders','deltoids','quads','quadriceps','glutes','hamstrings','calves','abs','obliques','core','biceps','triceps'];
        const lowerMG = mg.map(m => (m || '').toLowerCase());
        primary = prefOrder.find(p => lowerMG.includes(p)) || lowerMG[0] || e.category;
      }
      if (secondary.length === 0) {
        secondary = mg.filter(m => (m || '').toLowerCase() !== (primary || '').toLowerCase());
      }
      // Build union muscleGroup to keep backward compatibility
      const union = Array.from(new Set([...(mg || []), primary, ...secondary].filter(Boolean)));
      return {
        ...e,
        primaryMuscle: primary,
        secondaryMuscles: secondary,
        muscleGroup: union
      };
    });

    // Insert new default exercises
    await Exercise.insertMany(normalized);
    
    console.log('Default exercises seeded successfully!');
    process.exit();
  } catch (error) {
    console.error('Error seeding exercises:', error);
    process.exit(1);
  }
};

seedExercises();