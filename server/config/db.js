 
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/gymTracker';
    if (!process.env.MONGO_URI) {
      console.warn('MONGO_URI not set. Falling back to local Mongo at mongodb://127.0.0.1:27017/gymTracker');
    }
    await mongoose.connect(uri);
    console.log('MongoDB Connected Successfully');
  } catch (error) {
    console.error('MongoDB Connection Error:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;