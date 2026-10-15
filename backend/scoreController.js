const Score = require('./Score');
const { isDBConnected } = require('./db');

/**
 * Controller for submitting a new player score.
 * POST /api/scores
 * 
 * Note on Security & Cheat Prevention:
 * Client-side scores submitted directly over HTTP are inherently vulnerable to tampering.
 * Trustworthy score verification requires additional server-side game validation (e.g.,
 * validating cryptographic move sequences, replay logs, or server-authoritative card flipping).
 */
async function submitScore(req, res, next) {
  try {
    if (!isDBConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database service is currently unavailable. Please verify MONGODB_URI in your .env configuration.',
      });
    }

    const { isValid, errors, sanitized } = Score.validateScoreData(req.body);

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed for submitted score.',
        errors,
      });
    }

    const createdScore = await Score.create(sanitized);

    return res.status(201).json({
      success: true,
      message: 'Score submitted successfully!',
      data: {
        id: createdScore._id,
        nickname: createdScore.nickname,
        score: createdScore.score,
        moves: createdScore.moves,
        timeTaken: createdScore.timeTaken,
        difficulty: createdScore.difficulty,
        createdAt: createdScore.createdAt,
      },
    });
  } catch (err) {
    if (err.status === 400) {
      return res.status(400).json({
        success: false,
        message: err.message,
        errors: err.errors || [err.message],
      });
    }
    next(err);
  }
}

/**
 * Controller for retrieving the leaderboard.
 * GET /api/scores/leaderboard
 * 
 * Query parameters supported:
 * - difficulty: Filter by 'Easy', 'Medium', or 'Hard'
 * - limit: Number of top scores to return (default 10, max 100)
 * - page: Page number for pagination (default 1)
 */
async function getLeaderboard(req, res, next) {
  try {
    if (!isDBConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database service is currently unavailable. Please verify MONGODB_URI in your .env configuration.',
      });
    }

    const { difficulty, limit, page } = req.query;

    const result = await Score.getLeaderboard({
      difficulty,
      limit,
      page,
    });

    return res.status(200).json({
      success: true,
      message: 'Leaderboard retrieved successfully.',
      count: result.scores.length,
      total: result.total,
      page: result.page,
      totalPages: result.totalPages,
      data: result.scores,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  submitScore,
  getLeaderboard,
};
