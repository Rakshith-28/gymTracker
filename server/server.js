const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

const connectDB = require('./config/db');




// Connect to MongoDB
connectDB();

const app = express();






// Middleware
app.use(cors());
app.use(express.json());


// Routes
const authRoutes = require('./routes/authRoutes');
const workoutRoutes = require('./routes/workoutRoutes');  // ADD THIS

app.use('/api/auth', authRoutes);
app.use('/api/workouts', workoutRoutes);  // ADD THIS






// Test route
app.get('/', (req, res) => {
  res.json({ message: 'Gym Tracker API is running!' });
});









const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});