const { MongoClient } = require('mongodb');

let client = null;
let db = null;

/**
 * Connect to MongoDB using environment variables.
 * Exposes reusable database connection without hardcoding credentials.
 */
async function connectDB() {
  if (db) {
    return db;
  }

  const uri = process.env.MONGODB_URI;
  const dbName = process.env.DB_NAME || 'neon_memory_db';

  if (!uri) {
    console.warn('⚠️ Warning: MONGODB_URI is not defined in environment variables. Database features will be unavailable until configured in .env');
    return null;
  }

  try {
    client = new MongoClient(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });

    await client.connect();
    db = client.db(dbName);
    console.log(`✅ Connected to MongoDB successfully. Database: [${dbName}]`);
    return db;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    client = null;
    db = null;
    return null;
  }
}

/**
 * Get active database instance
 * @returns {import('mongodb').Db|null}
 */
function getDB() {
  return db;
}

/**
 * Check if database is currently connected
 * @returns {boolean}
 */
function isDBConnected() {
  return db !== null;
}

/**
 * Close database connection gracefully
 */
async function closeDB() {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('MongoDB connection closed.');
  }
}

module.exports = {
  connectDB,
  getDB,
  isDBConnected,
  closeDB,
};
