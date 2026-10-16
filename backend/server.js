const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file at project root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { connectDB, isDBConnected } = require('./db');
const Score = require('./Score');
const scoreRoutes = require('./scores');

const app = express();
const PORT = process.env.PORT || 5000;

// ============================================================================
// CORS CONFIGURATION
// ============================================================================
// In development, allow local frontend origins (e.g. Live Server, localhost ports).
// In production, set CLIENT_ORIGIN in .env to your hosted frontend URL.
const allowedOrigin = process.env.CLIENT_ORIGIN || '*';
app.use(
  cors({
    origin: allowedOrigin === '*' ? '*' : allowedOrigin.split(',').map((o) => o.trim()),
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parsing middleware
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true }));

// ============================================================================
// API ROUTES
// ============================================================================

/**
 * Health Check Endpoint
 * GET /api/health
 */
app.get('/api/health', (req, res) => {
  const dbConnected = isDBConnected();
  res.status(200).json({
    status: 'ok',
    message: 'OopsieFlip API is active',
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime() * 100) / 100,
    database: dbConnected ? 'connected' : 'disconnected',
    environment: process.env.NODE_ENV || 'development',
  });
});

// Mount Scores API routes under /api/scores
app.use('/api/scores', scoreRoutes);

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend')));

// ============================================================================
// ERROR HANDLING & 404 NOT FOUND
// ============================================================================

// 404 Not Found Handler for unknown API routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Endpoint not found: [${req.method}] ${req.originalUrl}`,
  });
});

// Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(`❌ [Error] ${req.method} ${req.url}:`, err);

  const statusCode = err.status || err.statusCode || 500;
  const response = {
    success: false,
    message: err.message || 'Internal Server Error',
  };

  if (err.errors) {
    response.errors = err.errors;
  }

  // Include stack trace only in non-production environments
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
});

// ============================================================================
// SERVER INITIALIZATION
// ============================================================================
let server = null;

async function startServer() {
  // Connect to database if URI is provided
  const db = await connectDB();
  if (db) {
    await Score.ensureIndexes(db);
  } else {
    console.log('ℹ️ Server starting without active MongoDB connection (DB-dependent routes will return 503 until configured).');
  }

  return new Promise((resolve, reject) => {
    server = app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`🚀 OopsieFlip Server is ACTIVE & RUNNING!`);
      console.log(`🎮 Play the Game: http://localhost:${PORT}`);
      console.log(`📡 API Health:    http://localhost:${PORT}/api/health`);
      console.log(`🏆 Leaderboard:   http://localhost:${PORT}/api/scores/leaderboard`);
      console.log(`====================================================`);
      console.log(`ℹ️ The server is running live. Keep this window open!`);
      console.log(`👉 Open http://localhost:${PORT} in your browser to play.`);
      resolve(server);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use by another process.`);
        console.error(`💡 Tip: Close the other process or run 'Stop-Process -Name node -Force' in PowerShell.`);
      }
      reject(err);
    });
  });
}

// Auto-start if run directly from command line (e.g., node backend/server.js)
if (require.main === module) {
  startServer().catch((err) => {
    console.error('Fatal server startup error:', err);
    process.exit(1);
  });
}

module.exports = { app, startServer };
