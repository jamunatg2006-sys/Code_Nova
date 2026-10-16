const { app } = require('../backend/server');

// Vercel Dynamic Serverless function entrypoint (catches /api/*)
module.exports = (req, res) => {
  if (!req.url.startsWith('/api')) {
    req.url = '/api' + req.url;
  }
  return app(req, res);
};
