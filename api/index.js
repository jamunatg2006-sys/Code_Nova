const { app } = require('../backend/server');

// Vercel Serverless Function entrypoint
module.exports = (req, res) => {
  // If Vercel strips the /api prefix, restore it so Express route matching succeeds
  if (!req.url.startsWith('/api')) {
    req.url = '/api' + req.url;
  }
  return app(req, res);
};
