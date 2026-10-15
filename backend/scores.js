const express = require('express');
const router = express.Router();
const { submitScore, getLeaderboard } = require('./scoreController');

/**
 * Neon Memory — Mind Flip Scores API Routes
 * Base route: /api/scores
 * 
 * ============================================================================
 * SECURITY NOTICE REGARDING CLIENT-SIDE CHEATING:
 * Submitting scores calculated exclusively in client-side JavaScript (browser)
 * cannot be guaranteed to be cheat-proof. Any tech-savvy user can inspect network
 * traffic, tamper with memory, or send fabricated POST requests.
 * 
 * For full anti-cheat guarantees in production, the backend should implement
 * server-authoritative validation (e.g., maintaining game session state,
 * tracking card flip timestamps on the server, or verifying cryptographically
 * signed move transcripts before accepting high scores).
 * ============================================================================
 */

/**
 * @route   POST /api/scores
 * @desc    Submit a new game score
 * @access  Public
 * @payload {
 *   nickname: string (2-20 chars, alphanumeric + space/underscore/hyphen),
 *   score: number (integer >= 0),
 *   moves: number (integer >= 1),
 *   timeTaken: number (seconds > 0),
 *   difficulty: "Easy" | "Medium" | "Hard"
 * }
 */
router.post('/', submitScore);

/**
 * @route   GET /api/scores/leaderboard
 * @desc    Retrieve ranked leaderboard
 * @access  Public
 * @query   difficulty (optional: "Easy" | "Medium" | "Hard")
 *          limit (optional: default 10, max 100)
 *          page (optional: default 1)
 */
router.get('/leaderboard', getLeaderboard);

module.exports = router;
