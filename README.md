# 🧠 Neon Memory — Mind Flip 🎮

An interactive, neon-themed memory-matching web game where players test their concentration, recall, and speed by flipping cards to find matching neon pairs. The project includes a full Node.js / Express / MongoDB backend for persistent high scores and a global leaderboard.

---

## 📋 Table of Contents
1. [Game Overview](#1-game-overview)
2. [Project Structure & File Guide](#2-project-structure--file-guide)
3. [Prerequisites & Installation](#3-prerequisites--installation)
4. [Configuring MongoDB](#4-configuring-mongodb)
5. [Starting the Backend](#5-starting-the-backend)
6. [Testing the API Endpoints](#6-testing-the-api-endpoints)
7. [Team Roles & File Ownership](#7-team-roles--file-ownership)
8. [Git Workflow for Teammates (Branches & Pull Requests)](#8-git-workflow-for-teammates-branches--pull-requests)
9. [Frontend-to-Backend Integration Guide](#9-frontend-to-backend-integration-guide)
10. [API Contract Reference](#10-api-contract-reference)
11. [Checklist Before Production Deployment](#11-checklist-before-production-deployment)

---

## 1. Game Overview

### How Neon Memory — Mind Flip Works:
1. **Enter the Game**: Players enter their nickname on the start screen.
2. **Choose Difficulty**:
   - **Easy**: 8 cards (4 matching pairs)
   - **Medium**: 16 cards (8 matching pairs)
   - **Hard**: 24 cards (12 matching pairs)
3. **Flip the Cards**: Cards start face-down with glowing neon card backs. Clicking flips them to reveal symbols.
4. **Match Pairs**: Matching cards stay face-up and glow with an accent animation. Mismatched cards flip back after a brief pause.
5. **Beat the Clock & Moves**: The game tracks elapsed seconds, total moves taken, and calculates a final score.
6. **Compete on the Leaderboard**: When the player wins, their score is submitted to the backend and ranked on the global leaderboard.

---

## 2. Project Structure & File Guide

```
neon-memory-mind-flip/
│
├── frontend/                     # Client-side web application
│   ├── index.html                # [Owned by Person 2] HTML structure & layout
│   ├── style.css                 # [Owned by Person 2] Neon styling, animations, responsiveness
│   ├── game.js                   # [Owned by Person 3] Core card flip, timer, & scoring logic
│   ├── leaderboard.js            # [Owned by Person 4] Fetch & display leaderboard rankings
│   └── assets/                   # Sound effects, card icons, images, favicon
│       └── .gitkeep
│
├── backend/                      # Server-side API & Database
│   ├── server.js                 # Express server init, CORS, routes mounting, 404 & error handlers
│   ├── db.js                     # MongoDB connection manager (official mongodb driver)
│   ├── Score.js                  # Score model, input validation, DB indexes, queries
│   ├── scoreController.js        # Controller methods for score submission & leaderboard fetch
│   ├── scores.js                 # Express router for /api/scores endpoints
│   └── tests/
│       └── test_validation.js   # Automated unit & integration test runner
│
├── .env.example                  # Template for environment configuration
├── .gitignore                    # Prevents node_modules, .env, and logs from being committed
├── package.json                  # Root npm project definition, dependencies, & scripts
└── README.md                     # Comprehensive team documentation (this file)
```

---

## 3. Prerequisites & Installation

### Step 1: Install Node.js
Ensure you have **Node.js (v18 or higher)** installed on your machine.
- Download from [nodejs.org](https://nodejs.org/).
- Verify installation in your terminal:
  ```bash
  node -v
  npm -v
  ```

### Step 2: Install Project Dependencies
In your terminal, navigate to the root folder and run:
```bash
npm install
```
This will install Express, the official MongoDB driver, CORS, Dotenv, and Nodemon.

---

## 4. Configuring MongoDB

You can use either **MongoDB Atlas (Free Cloud Database - Recommended)** or a **Local MongoDB instance**.

### Option A: MongoDB Atlas (Free Cloud Database)
1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) and create a free account.
2. Create a free shared cluster (M0 sandbox).
3. Under **Database Access**, create a database user (e.g., username `neon_user`, set a secure password).
4. Under **Network Access**, click **Add IP Address** and choose **Allow Access From Anywhere (`0.0.0.0/0`)** for development.
5. Click **Connect** > **Drivers** > copy the connection string.
   - Example: `mongodb+srv://neon_user:<password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority`
6. Create your `.env` file from the template:
   ```bash
   cp .env.example .env
   ```
7. Open `.env` and fill in your values:
   ```env
   PORT=5000
   MONGODB_URI=mongodb+srv://neon_user:YOUR_ACTUAL_PASSWORD@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority
   DB_NAME=neon_memory_db
   CLIENT_ORIGIN=*
   ```

### Option B: Local MongoDB
If you have MongoDB installed locally:
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017
DB_NAME=neon_memory_db
CLIENT_ORIGIN=*
```

> ⚠️ **Important Security Note**: Never commit your `.env` file to GitHub! The `.gitignore` file is already set up to protect it.

---

## 5. Starting the Backend

### Development Mode (Automatic server restart on code changes):
```bash
npm run dev
```

### Production / Standard Mode:
```bash
npm start
```

When successfully started, you will see output like:
```
✅ Connected to MongoDB successfully. Database: [neon_memory_db]
✅ MongoDB indexes ensured for scores collection.
====================================================
🚀 Neon Memory Backend running on port 5000
📡 Health Check: http://localhost:5000/api/health
🏆 Leaderboard:  http://localhost:5000/api/scores/leaderboard
🌐 CORS Origin: *
====================================================
```

---

## 6. Testing the API Endpoints

### 1. Automated Tests
Run the built-in test suite to verify validation rules and routing:
```bash
npm test
```

### 2. Manual Testing in Browser or Postman

#### A. Health Check
- URL: `http://localhost:5000/api/health`
- Method: `GET`
- Expected response:
  ```json
  {
    "status": "ok",
    "message": "Neon Memory — Mind Flip API is active",
    "timestamp": "2026-10-15T15:10:00.000Z",
    "uptime": 4.12,
    "database": "connected",
    "environment": "development"
  }
  ```

#### B. Leaderboard (Fetch top scores)
- URL: `http://localhost:5000/api/scores/leaderboard?difficulty=Medium&limit=10`
- Method: `GET`

#### C. Score Submission (Using cURL or Postman)
Using PowerShell:
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/scores" -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"nickname":"NeonHero","score":1450,"moves":16,"timeTaken":32.5,"difficulty":"Medium"}'
```

---

## 7. Team Roles & File Ownership

To prevent merge conflicts and maintain clean separation of concerns, each teammate has dedicated file ownership:

| Role | Teammate | Assigned Files | Responsibilities |
| :--- | :--- | :--- | :--- |
| **Team Lead** | Backend & DevOps | `backend/*`, `package.json`, `.env.example`, `.gitignore`, `README.md` | Architecture, Database, REST API, Git coordination |
| **Person 2** | UI & Styling | `frontend/index.html`, `frontend/style.css` | Game screen layout, neon glow effects, responsive card grid, modal styling |
| **Person 3** | Core Game Mechanics | `frontend/game.js` | Card generation, shuffle, flip states, matching detection, timer, move counter |
| **Person 4** | Leaderboard & API Fetch | `frontend/leaderboard.js` | Submitting score to API via `fetch()`, displaying top 10 rankings, difficulty filter |

> ⚠️ **Strict Rule**: Teammates must only edit their assigned files. Do not modify backend files or other members' frontend files without prior discussion.

---

## 8. Git Workflow for Teammates (Branches & Pull Requests)

Never commit directly to the `main` branch. Follow this standard team workflow:

### Step 1: Clone or Pull the Latest Changes
```bash
git pull origin main
```

### Step 2: Create a Feature Branch
Use a descriptive branch name indicating your role or feature:
```bash
# Person 2:
git checkout -b feature/ui-layout

# Person 3:
git checkout -b feature/game-mechanics

# Person 4:
git checkout -b feature/leaderboard-fetch
```

### Step 3: Write Code in Your Assigned Files
Work on your assigned files. Test your changes locally in the browser.

### Step 4: Stage, Review, and Commit
```bash
# Check status of changed files
git status

# Stage your specific files (example for Person 3)
git add frontend/game.js

# Commit with a clear, descriptive message
git commit -m "Implement card flip animation and pair-matching check"
```

### Step 5: Push Branch to GitHub
```bash
git push -u origin feature/game-mechanics
```

### Step 6: Create a Pull Request (PR)
1. Go to the repository on GitHub: `https://github.com/jamunatg2006-sys/Code_Nova`.
2. Click **Compare & pull request**.
3. Add a summary of what you implemented and request a review from the Team Lead.
4. Once reviewed and approved, the Team Lead will merge your branch into `main`.

---

## 9. Frontend-to-Backend Integration Guide

### 1. Connecting Score Submission (`frontend/game.js` or `frontend/leaderboard.js`)

When the game ends (all pairs matched), call the backend API:

```javascript
const API_BASE_URL = 'http://localhost:5000/api';

async function submitPlayerScore(nickname, score, moves, timeTaken, difficulty) {
  try {
    const response = await fetch(`${API_BASE_URL}/scores`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        nickname: nickname,
        score: Number(score),
        moves: Number(moves),
        timeTaken: Number(timeTaken),
        difficulty: difficulty, // "Easy", "Medium", or "Hard"
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Submission failed:', result.errors || result.message);
      alert('Error submitting score: ' + (result.message || 'Please check input.'));
      return false;
    }

    console.log('Score saved successfully:', result.data);
    return true;
  } catch (error) {
    console.error('Network error submitting score:', error);
    alert('Unable to connect to game server. Please make sure the backend is running.');
    return false;
  }
}
```

### 2. Fetching & Displaying the Leaderboard (`frontend/leaderboard.js`)

```javascript
async function loadLeaderboard(difficulty = 'Medium') {
  try {
    const url = `http://localhost:5000/api/scores/leaderboard?difficulty=${encodeURIComponent(difficulty)}&limit=10`;
    const response = await fetch(url);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to fetch leaderboard');
    }

    const leaderboardTable = document.getElementById('leaderboard-body');
    leaderboardTable.innerHTML = ''; // Clear previous entries

    result.data.forEach((entry) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>#${entry.rank}</td>
        <td>${escapeHtml(entry.nickname)}</td>
        <td>${entry.score} pts</td>
        <td>${entry.moves}</td>
        <td>${entry.timeTaken}s</td>
      `;
      leaderboardTable.appendChild(row);
    });
  } catch (error) {
    console.error('Error loading leaderboard:', error);
  }
}

// Simple helper to prevent HTML injection in displayed nicknames
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
```

---

## 10. API Contract Reference

### Endpoint 1: Submit Score
- **URL**: `/api/scores`
- **Method**: `POST`
- **Headers**: `Content-Type: application/json`

#### Request Body:
| Field | Type | Required | Constraints |
| :--- | :--- | :--- | :--- |
| `nickname` | `string` | Yes | 2–20 characters, alphanumeric, spaces, `_`, `-` |
| `score` | `number` | Yes | Non-negative integer (>= 0) |
| `moves` | `number` | Yes | Positive integer (>= 1) |
| `timeTaken` | `number` | Yes | Float or integer in seconds (> 0) |
| `difficulty` | `string` | Yes | Exactly `"Easy"`, `"Medium"`, or `"Hard"` |

#### Success Response (`201 Created`):
```json
{
  "success": true,
  "message": "Score submitted successfully!",
  "data": {
    "id": "670ec4a9e5b29f0012345678",
    "nickname": "NeonHero",
    "score": 1450,
    "moves": 16,
    "timeTaken": 32.5,
    "difficulty": "Medium",
    "createdAt": "2026-10-15T15:15:00.000Z"
  }
}
```

#### Error Response (`400 Bad Request`):
```json
{
  "success": false,
  "message": "Validation failed for submitted score.",
  "errors": [
    "Nickname must be between 2 and 20 characters.",
    "Score cannot be negative."
  ]
}
```

---

### Endpoint 2: Get Leaderboard
- **URL**: `/api/scores/leaderboard`
- **Method**: `GET`
- **Query Parameters**:
  - `difficulty` *(optional)*: `"Easy"`, `"Medium"`, or `"Hard"`
  - `limit` *(optional)*: Number of rows to return (default: `10`, maximum: `100`)
  - `page` *(optional)*: Page number for pagination (default: `1`)

#### Sorting Rule:
Leaderboard is sorted by **highest score first (`score: -1`)**. In case of a tie, the player with the **lower completion time (`timeTaken: 1`)** ranks higher, followed by lower moves count.

#### Success Response (`200 OK`):
```json
{
  "success": true,
  "message": "Leaderboard retrieved successfully.",
  "count": 2,
  "total": 2,
  "page": 1,
  "totalPages": 1,
  "data": [
    {
      "rank": 1,
      "id": "670ec4a9e5b29f0012345678",
      "nickname": "NeonHero",
      "score": 1450,
      "moves": 16,
      "timeTaken": 32.5,
      "difficulty": "Medium",
      "createdAt": "2026-10-15T15:15:00.000Z"
    },
    {
      "rank": 2,
      "id": "670ec4a9e5b29f0012345679",
      "nickname": "CyberGamer",
      "score": 1450,
      "moves": 18,
      "timeTaken": 35.0,
      "difficulty": "Medium",
      "createdAt": "2026-10-15T15:16:00.000Z"
    }
  ]
}
```

---

### Endpoint 3: Health Check
- **URL**: `/api/health`
- **Method**: `GET`
- **Response (`200 OK`)**:
```json
{
  "status": "ok",
  "message": "Neon Memory — Mind Flip API is active",
  "timestamp": "2026-10-15T15:10:00.000Z",
  "uptime": 42.15,
  "database": "connected",
  "environment": "development"
}
```

---

## 11. Checklist Before Production Deployment

- [ ] **Configure Production CORS**: In `.env`, set `CLIENT_ORIGIN=https://your-frontend-domain.com` instead of `*`.
- [ ] **Set `NODE_ENV=production`**: This disables stack trace exposure in error responses.
- [ ] **Secure Database Credentials**: Use environment variables in hosting providers (e.g. Render, Railway, Heroku) instead of hardcoding.
- [ ] **Database Connection Resilience**: Ensure MongoDB Atlas IP Whitelist includes the cloud provider's outgoing IPs or `0.0.0.0/0`.
- [ ] **Server-Side Anti-Cheat (Future Enhancement)**:
  > ⚠️ *Note on Cheat Prevention*: In any browser-based game, scores sent over client HTTP requests can theoretically be manipulated. For a commercial or competitive release, implement server-side validation such as storing card layouts in server sessions, recording move timestamps, or verifying replay hashes.
