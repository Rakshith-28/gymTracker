// Seed a demo user and realistic workout data
require('dotenv').config();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const User = require('./models/User');
const Workout = require('./models/Workout');
const WorkoutSession = require('./models/WorkoutSession');

const DEMO_NAME = process.env.DEMO_USER_NAME || 'testuser';
const DEMO_EMAIL = process.env.DEMO_USER_EMAIL || 'test@demo.com';
const DEMO_PASSWORD = process.env.DEMO_USER_PASSWORD || 'Test123!';

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// Exercise pools by template
const TEMPLATES = {
  Push: [
    { name: 'Bench Press', base: 60 },
    { name: 'Incline Dumbbell Press', base: 24 },
    { name: 'Overhead Press', base: 40 },
    { name: 'Lateral Raise', base: 12 },
    { name: 'Cable Pushdown', base: 30 },
  ],
  Pull: [
    { name: 'Pull-ups', base: 0 }, // bodyweight
    { name: 'Barbell Row', base: 55 },
    { name: 'Lat Pulldown', base: 45 },
    { name: 'Seated Cable Row', base: 50 },
    { name: 'Face Pull (Rope)', base: 12 },
    { name: 'Barbell Curl', base: 25 },
  ],
  Legs: [
    { name: 'Squat', base: 80 },
    { name: 'Romanian Deadlift', base: 70 },
    { name: 'Leg Press', base: 140 },
    { name: 'Leg Curl', base: 35 },
    { name: 'Leg Extension', base: 35 },
    { name: 'Calf Raise', base: 50 },
  ],
  'Full Body': [
    { name: 'Deadlift', base: 100 },
    { name: 'Bench Press', base: 65 },
    { name: 'Pull-ups', base: 0 },
    { name: 'Overhead Press', base: 42 },
    { name: 'Lunges', base: 20 },
    { name: 'Hanging Leg Raise', base: 0 },
  ],
  Cardio: [
    { name: 'Running', base: 0 },
    { name: 'Rowing Machine', base: 0 },
    { name: 'Cycling', base: 0 },
    { name: 'Elliptical', base: 0 },
  ],
};

function makeSets(baseWeight) {
  // 3-4 sets, 6-12 reps, slight progression/regression, weight optional for bodyweight/cardio
  const setsCount = randInt(3, 4);
  const sets = [];
  for (let i = 0; i < setsCount; i++) {
    const reps = randInt(6, 12);
    const weight = baseWeight === 0 ? 0 : Math.max(0, Math.round((baseWeight + randInt(-5, 5)) / 2) * 2);
    sets.push({ reps, weight });
  }
  return sets;
}

function makeSessionBlock(templateName) {
  const pool = TEMPLATES[templateName];
  const exercises = [];
  const count = templateName === 'Cardio' ? randInt(1, 2) : randInt(5, 8);
  const picked = [...pool].sort(() => 0.5 - Math.random()).slice(0, Math.min(count, pool.length));
  for (const ex of picked) {
    const durationPerExerciseMin = templateName === 'Cardio' ? randInt(15, 35) : randInt(6, 12);
    const durationSec = durationPerExerciseMin * 60;
    exercises.push({
      name: ex.name,
      startTime: new Date(), // placeholder, set later by timeline builder
      endTime: new Date(),
      duration: durationSec,
      sets: makeSets(ex.base),
      notes: Math.random() < 0.2 ? pick(['Felt strong', 'Form focus', 'Deload', 'PR attempt']) : undefined,
      confidence: Math.random() < 0.8 ? randInt(3, 5) : randInt(1, 3),
      restAfter: randInt(60, 120),
    });
  }
  return exercises;
}

function timelineExercises(start, exercises) {
  // Lay out start/end/duration sequentially
  let cursor = new Date(start);
  return exercises.map((ex) => {
    const exStart = new Date(cursor);
    const exEnd = new Date(exStart.getTime() + (ex.duration || 0) * 1000);
    cursor = new Date(exEnd.getTime() + (ex.restAfter || 60) * 1000);
    return { ...ex, startTime: exStart, endTime: exEnd };
  });
}

async function seed() {
  await connectDB();

  try {
    // Upsert user
    let user = await User.findOne({ email: DEMO_EMAIL });
    if (!user) {
      const hashed = await bcrypt.hash(DEMO_PASSWORD, 10);
      user = await User.create({ name: DEMO_NAME, email: DEMO_EMAIL, password: hashed });
      console.log('Created demo user');
    } else {
      console.log('Demo user already exists');
    }

    // Clean previous demo data for this user
    await Workout.deleteMany({ userId: user._id });
    await WorkoutSession.deleteMany({ userId: user._id });

    const templates = ['Push', 'Pull', 'Legs', 'Full Body', 'Cardio'];

    // Create 12 sessions over last 30 days
    const sessionsToCreate = randInt(10, 15);
    const now = new Date();
    const sessionsPayload = [];

    for (let i = 0; i < sessionsToCreate; i++) {
      const daysAgo = randInt(1, 30);
      const startHour = randInt(6, 20); // day time
      const start = new Date(now);
      start.setDate(now.getDate() - daysAgo);
      start.setHours(startHour, randInt(0, 59), randInt(0, 59), 0);

      const tmpl = pick(templates);
      const rawExercises = makeSessionBlock(tmpl);
      const laidOut = timelineExercises(start, rawExercises);

      const totalActiveSec = laidOut.reduce((s, e) => s + (e.duration || 0), 0);
      const totalRestSec = laidOut.reduce((s, e) => s + (e.restAfter || 0), 0);
      const totalDurationSec = (laidOut.at(-1)?.endTime.getTime() - start.getTime()) / 1000;

      const feeling = randInt(2, 5);
      const notes = Math.random() < 0.4 ? pick(['Solid session', 'Tired but completed', 'Great pump', 'Worked on form', 'Quick cardio']) : undefined;

      const sessionDoc = {
        userId: user._id,
        startTime: start,
        endTime: laidOut.at(-1)?.endTime,
        totalDuration: Math.round(totalDurationSec),
        totalActiveDuration: Math.round(totalActiveSec),
        totalRestDuration: Math.round(totalRestSec),
        exercises: laidOut,
        notes,
        feeling,
      };

      sessionsPayload.push(sessionDoc);
    }

    const createdSessions = await WorkoutSession.insertMany(sessionsPayload);
    console.log(`Created ${createdSessions.length} workout sessions`);

    // Create corresponding simple Workout docs for history page
    const workoutsPayload = createdSessions.map((s) => ({
      userId: s.userId,
      date: s.startTime,
      duration: Math.round((s.totalDuration || 0) / 60), // minutes
      notes: s.notes,
      exercises: s.exercises.map((e) => ({
        name: e.name,
        sets: e.sets.map((st) => ({ reps: st.reps, weight: st.weight })),
      })),
    }));

    await Workout.insertMany(workoutsPayload);
    console.log(`Created ${workoutsPayload.length} workouts`);

    console.log('Demo data seeded successfully');
  } catch (err) {
    console.error('Seeding error:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
}

seed();
