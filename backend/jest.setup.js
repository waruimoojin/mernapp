const dotenv = require('dotenv');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// 1. Load environment variables (optional for memory server)
dotenv.config({ path: '.env.test' });

// 2. Create in-memory MongoDB instance
let mongoServer;

module.exports = async () => {
  try {
    // Start the in-memory MongoDB server
    mongoServer = await MongoMemoryServer.create();
    
    // Override MONGO_URI with in-memory server URI
    const mongoUri = mongoServer.getUri();
    process.env.MONGO_URI = mongoUri;

    // Configure mongoose connection
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    console.log(`✅ Test MongoDB connected: ${mongoUri}`);
  } catch (err) {
    console.error('❌ Test MongoDB connection error:', err);
    // Clean up if connection fails
    if (mongoServer) await mongoServer.stop();
    throw err;
  }
};

// Add cleanup hook
module.exports.teardown = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
  console.log('🛑 Test MongoDB disconnected');
};