# 🧠 OopsieFlip 🎮

> An interactive, neon-cyberpunk memory matching game with real-time score tracking, audio synthesis, and a persistent global leaderboard powered by MongoDB.

---

## 🌟 Overview

**OopsieFlip** is a responsive web-based memory card game designed with high-contrast cyberpunk neon aesthetics. Players enter an operative nickname, select a challenge level, and race against the clock to match hidden symbol pairs across a responsive 3D card grid. 

Completed game results are automatically synced to a live MongoDB Atlas database, ranking players on a persistent global leaderboard by highest score and fastest completion time.

---

## 🛠️ Technology Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend** | Vanilla HTML5 (Single-Page Navigation), CSS3 (Cyberpunk Neon Theme & 3D Transforms), JavaScript (ES6+) |
| **Backend** | Node.js, Express.js REST API |
| **Database** | MongoDB Atlas (Native `mongodb` Driver with connection pooling & compound indexing) |
| **Audio** | Web Audio API (Synthesizes sound effects natively in-browser without external audio files) |
| **Testing** | Built-in Automated Unit & HTTP Integration Test Runner (24 test assertions) |

---

## 🎮 Gameplay & Features

1. **Operative Setup**: Enter a unique nickname (2–20 characters) and select difficulty:
   - **Easy Mode**: 8 Cards (4 Pairs) — 1.0× multiplier
   - **Medium Mode**: 16 Cards (8 Pairs) — 1.5× multiplier
   - **Hard Mode**: 24 Cards (12 Pairs) — 2.0× multiplier
2. **3D Card Flipping**: Flip cards to discover matching neon icons. Mismatches shake and flip back after a brief pause.
3. **Smart Scoring**: Points are computed from matched pairs, time bonuses, and move efficiency, scaled by the difficulty multiplier.
4. **Auto-Save to Leaderboard**: Scores are automatically sent to MongoDB upon victory — zero extra buttons needed.
5. **Interactive Leaderboard**: Filter by difficulty, view the Top 3 Podium (🥇, 🥈, 🥉), navigate with pagination, and see your own record highlighted with a `YOU` badge.
6. **Mobile Responsive**: Fully optimized for mobile screens, tablets, and laptops.

---

## 🚀 Quick Start Guide

### 1. Prerequisites
Ensure **Node.js (v18+)** is installed on your computer.

### 2. Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/jamunatg2006-sys/Code_Nova.git
cd Code_Nova
npm install
```

### 3. Environment Configuration
Copy `.env.example` to create `.env`:
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
DB_NAME=neon_memory_db
CLIENT_ORIGIN=*
```

### 4. Run the Application
Start the backend & frontend together:
```bash
npm start
```
Then open your browser to:
👉 **`http://localhost:5000`**

### 5. Run Automated Tests
```bash
npm test
```

---

## 📡 REST API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Server uptime & MongoDB connection status |
| `GET` | `/api/scores/leaderboard` | Retrieve ranked scores (supports `?difficulty=...&page=1&limit=10`) |
| `POST` | `/api/scores` | Submit game result `{ nickname, score, moves, timeTaken, difficulty }` |

---

## 📁 Project Structure

```
OopsieFlip/
├── backend/
│   ├── server.js               # Express application & static frontend server
│   ├── db.js                   # MongoDB Atlas connection manager with pooling
│   ├── Score.js                # Score model, validation rules & compound indexes
│   ├── scoreController.js      # Leaderboard query & submission handlers
│   ├── scores.js               # Express API routing for /api/scores
│   └── tests/
│       └── test_validation.js # 24 automated unit & integration tests
│
├── frontend/
│   ├── index.html              # Multi-page layout (Play, Leaderboard, Rules, About)
│   ├── style.css               # Neon visual theme, 3D animations & mobile responsiveness
│   ├── game.js                 # Core memory card flip mechanics, audio engine & timer
│   └── leaderboard.js          # REST API communication, podium rendering & pagination
│
├── .env.example                # Template for environment configuration
├── package.json                # Project dependencies & scripts
└── README.md                   # Project documentation
```

---

## 👥 Team & Contribution Breakdown

This project was built collaboratively by **Team Code Nova**:

### 🌟 Jamuna T G — Project Lead & Full-Stack Architect *(Main Person)*
* **Architecture & Backend**: Built the Express.js server, REST API endpoints, centralized error handling, and static client serving.
* **Database & Security**: Configured MongoDB Atlas connection pooling, robust payload sanitization/validation, and database compound indexes.
* **Full-Stack Integration**: Integrated frontend with backend APIs, handled cross-origin requests, and integrated Web Audio synthesizer.
* **Game Logic & Refinements**: Designed the scoring formula, auto-submission flow, personal operative banners, and overall user journey.
* **DevOps & QA**: Built the 24-assertion automated test suite, GitHub repository coordination, and deployment configuration.

### 🎨 Niharika Patil — Frontend UI/UX
* Created the initial markup structure in `frontend/index.html`.
* Designed the core neon styling, color palette, and layout elements in `frontend/style.css`.

### 🏆 Jaithra Sree Ram — Leaderboard Integration
* Implemented leaderboard rendering, podium structure, and table display in `frontend/leaderboard.js`.
* Assisted with leaderboard difficulty filtering and API integration.

### 🃏 Diksha — Game Mechanics
* Contributed to the card flipping, deck shuffling, and pair-matching mechanics in `frontend/game.js`.
* Assisted with move counter tracking and elapsed timer logic.

---

© 2026 **OopsieFlip** | Developed by Team Code Nova
