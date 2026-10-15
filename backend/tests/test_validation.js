const http = require('http');
const Score = require('../Score');
const { app } = require('../server');
const { connectDB, closeDB } = require('../db');

let passedTests = 0;
let failedTests = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    failedTests++;
  }
}

async function runTests() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING VALIDATION & INTEGRATION TESTS');
  console.log('======================================================\n');

  // --------------------------------------------------------------------------
  // 1. UNIT TESTS: Score Validation Logic
  // --------------------------------------------------------------------------
  console.log('--- 1. Testing Input Validation (Score.validateScoreData) ---');

  // Test 1.1: Valid payload
  const validData = {
    nickname: 'NeonAce',
    score: 1250,
    moves: 14,
    timeTaken: 38.5,
    difficulty: 'Medium',
  };
  const res1 = Score.validateScoreData(validData);
  assert(res1.isValid === true && res1.errors.length === 0, 'Accepts valid score payload');
  assert(res1.sanitized.difficulty === 'Medium', 'Sanitized difficulty matches');
  assert(res1.sanitized.timeTaken === 38.5, 'Sanitized timeTaken rounds accurately');

  // Test 1.2: Case-insensitive difficulty normalization
  const resCase = Score.validateScoreData({ ...validData, difficulty: 'hard' });
  assert(resCase.isValid === true && resCase.sanitized.difficulty === 'Hard', 'Normalizes lowercase "hard" to "Hard"');

  // Test 1.3: Reject invalid difficulty
  const resBadDiff = Score.validateScoreData({ ...validData, difficulty: 'Nightmare' });
  assert(resBadDiff.isValid === false && resBadDiff.errors.some(e => e.includes('Difficulty must be one of')), 'Rejects unlisted difficulty');

  // Test 1.4: Reject invalid nickname (too short, too long, special characters)
  const resShortNick = Score.validateScoreData({ ...validData, nickname: 'A' });
  assert(resShortNick.isValid === false && resShortNick.errors.some(e => e.includes('between 2 and 20')), 'Rejects nickname shorter than 2 chars');

  const resLongNick = Score.validateScoreData({ ...validData, nickname: 'A'.repeat(25) });
  assert(resLongNick.isValid === false && resLongNick.errors.some(e => e.includes('between 2 and 20')), 'Rejects nickname longer than 20 chars');

  const resSpecialNick = Score.validateScoreData({ ...validData, nickname: '<script>alert(1)</script>' });
  assert(resSpecialNick.isValid === false && resSpecialNick.errors.some(e => e.includes('letters, numbers')), 'Rejects nickname with invalid characters / XSS');

  // Test 1.5: Reject negative or non-integer score
  const resNegScore = Score.validateScoreData({ ...validData, score: -50 });
  assert(resNegScore.isValid === false && resNegScore.errors.some(e => e.includes('negative')), 'Rejects negative score');

  const resFloatScore = Score.validateScoreData({ ...validData, score: 100.5 });
  assert(resFloatScore.isValid === false && resFloatScore.errors.some(e => e.includes('integer')), 'Rejects non-integer score');

  // Test 1.6: Reject invalid moves
  const resZeroMoves = Score.validateScoreData({ ...validData, moves: 0 });
  assert(resZeroMoves.isValid === false && resZeroMoves.errors.some(e => e.includes('at least 1')), 'Rejects moves count of 0');

  // Test 1.7: Reject invalid completion time
  const resZeroTime = Score.validateScoreData({ ...validData, timeTaken: 0 });
  assert(resZeroTime.isValid === false && resZeroTime.errors.some(e => e.includes('greater than 0')), 'Rejects timeTaken <= 0');

  // --------------------------------------------------------------------------
  // 2. HTTP SERVER INTEGRATION TESTS
  // --------------------------------------------------------------------------
  console.log('\n--- 2. Testing HTTP Endpoints ---');

  const testServer = http.createServer(app);
  await new Promise((resolve) => testServer.listen(0, resolve));
  const testPort = testServer.address().port;

  function makeRequest(method, path, body = null) {
    return new Promise((resolve, reject) => {
      const payloadStr = body ? JSON.stringify(body) : null;
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port: testPort,
          path,
          method,
          headers: {
            'Content-Type': 'application/json',
            ...(payloadStr ? { 'Content-Length': Buffer.byteLength(payloadStr) } : {}),
          },
        },
        (res) => {
          let rawData = '';
          res.on('data', (chunk) => (rawData += chunk));
          res.on('end', () => {
            try {
              const parsed = JSON.parse(rawData);
              resolve({ statusCode: res.statusCode, data: parsed });
            } catch (e) {
              resolve({ statusCode: res.statusCode, raw: rawData });
            }
          });
        }
      );
      req.on('error', reject);
      if (payloadStr) req.write(payloadStr);
      req.end();
    });
  }

  try {
    // Test 2.1: Health endpoint
    const healthRes = await makeRequest('GET', '/api/health');
    assert(healthRes.statusCode === 200, 'GET /api/health returns HTTP 200');
    assert(healthRes.data.status === 'ok', 'GET /api/health reports status "ok"');
    assert(typeof healthRes.data.uptime === 'number', 'GET /api/health includes uptime');

    // Test 2.2: 404 Route handling
    const notFoundRes = await makeRequest('GET', '/api/non-existent-route');
    assert(notFoundRes.statusCode === 404, 'Unknown endpoint returns HTTP 404');
    assert(notFoundRes.data.success === false, '404 response has success: false');

    // Test 2.3: Reject malformed payload on POST /api/scores (without needing DB)
    const badPostRes = await makeRequest('POST', '/api/scores', {
      nickname: 'TooLongNicknameForMemoryGame',
      score: -100,
      moves: -1,
      timeTaken: -5,
      difficulty: 'SuperExtreme',
    });
    // When DB is disconnected, either validation runs or service unavailable is returned safely
    assert(
      badPostRes.statusCode === 400 || badPostRes.statusCode === 503,
      `POST /api/scores with invalid body properly rejected (HTTP ${badPostRes.statusCode})`
    );

    // Test 2.4: Connect to DB if configured
    let db = null;
    if (process.env.MONGODB_URI) {
      db = await connectDB();
    }

    const healthResAfter = await makeRequest('GET', '/api/health');
    const dbConnected = healthResAfter.data.database;
    console.log(`\nℹ️ Current MongoDB Status in test environment: [${dbConnected}]`);

    if (dbConnected === 'connected') {
      assert(true, 'Connected to live MongoDB database successfully');

      // Test 2.5: Live score submission
      const livePostRes = await makeRequest('POST', '/api/scores', {
        nickname: 'NeonChamp',
        score: 1800,
        moves: 12,
        timeTaken: 25.4,
        difficulty: 'Hard',
      });
      assert(livePostRes.statusCode === 201, 'POST /api/scores creates score in Atlas (HTTP 201)');
      assert(livePostRes.data.success === true, 'POST /api/scores returns success: true');
      const createdId = livePostRes.data.data?.id;

      // Test 2.6: Live leaderboard retrieval
      const liveLbRes = await makeRequest('GET', '/api/scores/leaderboard?difficulty=Hard');
      assert(liveLbRes.statusCode === 200, 'GET /api/scores/leaderboard returns HTTP 200');
      assert(Array.isArray(liveLbRes.data.data), 'Leaderboard data is an array');
      assert(liveLbRes.data.data.some(s => s.nickname === 'NeonChamp'), 'Submitted score appears in leaderboard');

      // Cleanup test score
      if (createdId && db) {
        const { ObjectId } = require('mongodb');
        await db.collection('scores').deleteOne({ _id: new ObjectId(createdId) });
        console.log('  🧹 Cleaned up temporary test score from database');
      }
    } else {
      console.log('ℹ️ Notice: MongoDB is disconnected in test environment.');
      console.log('ℹ️ Score insertion and live database queries safely return 503 Service Unavailable when DB is unconfigured.');
    }
  } finally {
    testServer.close();
    await closeDB();
  }

  console.log('\n======================================================');
  console.log(`📊 Test Summary: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('======================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runTests().catch((err) => {
    console.error('Test execution failed:', err);
    process.exit(1);
  });
}

module.exports = { runTests };
