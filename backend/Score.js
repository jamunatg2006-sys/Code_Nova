const { getDB } = require('./db');

const COLLECTION_NAME = 'scores';
const VALID_DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

/**
 * Validates score submission data.
 * @param {Object} data 
 * @returns {{ isValid: boolean, errors: string[], sanitized: Object|null }}
 */
function validateScoreData(data) {
  const errors = [];

  if (!data || typeof data !== 'object') {
    return { isValid: false, errors: ['Request body must be a valid JSON object.'], sanitized: null };
  }

  // 1. Nickname validation
  let nickname = data.nickname;
  if (typeof nickname !== 'string') {
    errors.push('Nickname must be a text string.');
  } else {
    nickname = nickname.trim();
    if (nickname.length < 2 || nickname.length > 20) {
      errors.push('Nickname must be between 2 and 20 characters.');
    }
    const nicknameRegex = /^[a-zA-Z0-9 _-]+$/;
    if (!nicknameRegex.test(nickname)) {
      errors.push('Nickname can only contain letters, numbers, spaces, underscores, and hyphens.');
    }
  }

  // 2. Score validation
  const score = Number(data.score);
  if (data.score === undefined || data.score === null || isNaN(score)) {
    errors.push('Score must be a valid number.');
  } else if (!Number.isInteger(score)) {
    errors.push('Score must be an integer.');
  } else if (score < 0) {
    errors.push('Score cannot be negative.');
  } else if (score > 1000000) {
    errors.push('Score exceeds maximum allowed value.');
  }

  // 3. Moves validation
  const moves = Number(data.moves);
  if (data.moves === undefined || data.moves === null || isNaN(moves)) {
    errors.push('Moves must be a valid number.');
  } else if (!Number.isInteger(moves)) {
    errors.push('Moves must be an integer.');
  } else if (moves < 1) {
    errors.push('Moves must be at least 1.');
  } else if (moves > 5000) {
    errors.push('Moves count exceeds realistic limit.');
  }

  // 4. Time taken (completion time in seconds) validation
  const timeTaken = Number(data.timeTaken);
  if (data.timeTaken === undefined || data.timeTaken === null || isNaN(timeTaken)) {
    errors.push('Completion time (timeTaken) must be a valid number.');
  } else if (timeTaken <= 0) {
    errors.push('Completion time must be greater than 0 seconds.');
  } else if (timeTaken > 86400) {
    errors.push('Completion time exceeds maximum allowed limit (24 hours).');
  }

  // 5. Difficulty validation
  let difficulty = data.difficulty;
  if (typeof difficulty !== 'string') {
    errors.push('Difficulty must be a string.');
  } else {
    // Normalize case: "easy" -> "Easy", "EASY" -> "Easy"
    const matched = VALID_DIFFICULTIES.find(
      (d) => d.toLowerCase() === difficulty.trim().toLowerCase()
    );
    if (!matched) {
      errors.push(`Difficulty must be one of: ${VALID_DIFFICULTIES.join(', ')}.`);
    } else {
      difficulty = matched;
    }
  }

  if (errors.length > 0) {
    return { isValid: false, errors, sanitized: null };
  }

  return {
    isValid: true,
    errors: [],
    sanitized: {
      nickname,
      score,
      moves,
      timeTaken: Math.round(timeTaken * 100) / 100, // round to 2 decimal places
      difficulty,
      createdAt: new Date(),
    },
  };
}

/**
 * Ensures indexes exist on the scores collection for fast leaderboard queries.
 * @param {import('mongodb').Db} dbInstance 
 */
async function ensureIndexes(dbInstance) {
  try {
    const collection = dbInstance.collection(COLLECTION_NAME);
    // Compound index for global leaderboard: highest score first, lowest time taken as tie-breaker
    await collection.createIndex(
      { score: -1, timeTaken: 1, createdAt: -1 },
      { name: 'idx_leaderboard_global' }
    );
    // Compound index for difficulty-filtered leaderboard
    await collection.createIndex(
      { difficulty: 1, score: -1, timeTaken: 1, createdAt: -1 },
      { name: 'idx_leaderboard_difficulty' }
    );
    console.log('✅ MongoDB indexes ensured for scores collection.');
  } catch (err) {
    console.warn('⚠️ Could not create indexes:', err.message);
  }
}

/**
 * Score Data Access Object
 */
const Score = {
  VALID_DIFFICULTIES,
  validateScoreData,
  ensureIndexes,

  /**
   * Insert a new score record
   * @param {Object} scoreData
   * @returns {Promise<Object>} Inserted document
   */
  async create(scoreData) {
    const db = getDB();
    if (!db) {
      throw new Error('Database is not connected. Please verify MONGODB_URI in .env');
    }

    const { isValid, errors, sanitized } = validateScoreData(scoreData);
    if (!isValid) {
      const err = new Error(errors.join(' '));
      err.status = 400;
      err.errors = errors;
      throw err;
    }

    const collection = db.collection(COLLECTION_NAME);
    const result = await collection.insertOne(sanitized);

    return {
      _id: result.insertedId,
      ...sanitized,
    };
  },

  /**
   * Fetch leaderboard with sorting and pagination
   * Sorting rule: Highest score first (-1), lower completion time (1) as tie-breaker.
   * @param {Object} options
   * @param {string} [options.difficulty] - Optional filter by difficulty
   * @param {number} [options.limit=10] - Number of results (safe max 100)
   * @param {number} [options.page=1] - Page number
   * @returns {Promise<{ scores: Array, total: number, page: number, limit: number }>}
   */
  async getLeaderboard({ difficulty, limit = 10, page = 1 } = {}) {
    const db = getDB();
    if (!db) {
      throw new Error('Database is not connected. Please verify MONGODB_URI in .env');
    }

    const collection = db.collection(COLLECTION_NAME);

    // Build filter query
    const filter = {};
    if (difficulty) {
      const matched = VALID_DIFFICULTIES.find(
        (d) => d.toLowerCase() === String(difficulty).trim().toLowerCase()
      );
      if (matched) {
        filter.difficulty = matched;
      }
    }

    // Safe bounds for pagination
    const safeLimit = Math.max(1, Math.min(Number(limit) || 10, 100));
    const safePage = Math.max(1, Number(page) || 1);
    const skip = (safePage - 1) * safeLimit;

    // Sorting: highest score (-1), lowest timeTaken (1), lowest moves (1)
    const sort = { score: -1, timeTaken: 1, moves: 1, createdAt: -1 };

    const [scores, total] = await Promise.all([
      collection.find(filter).sort(sort).skip(skip).limit(safeLimit).toArray(),
      collection.countDocuments(filter),
    ]);

    // Attach ranks
    const rankedScores = scores.map((item, index) => ({
      rank: skip + index + 1,
      id: item._id,
      nickname: item.nickname,
      score: item.score,
      moves: item.moves,
      timeTaken: item.timeTaken,
      difficulty: item.difficulty,
      createdAt: item.createdAt,
    }));

    return {
      scores: rankedScores,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit) || 1,
    };
  },
};

module.exports = Score;
