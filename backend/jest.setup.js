const dotenv = require('dotenv');
const mongoose = require('mongoose');

// 1. Load test environment variables
dotenv.config({ path: '.env.test' });

// 2. Configure MongoDB connection
module.exports = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      // Recommended settings for Jest testing:
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ Test MongoDB connected');
  } catch (err) {
    console.error('❌ Test MongoDB connection error:', err);
    throw err; // This will fail the test suite
  }
};