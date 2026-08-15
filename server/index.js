const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const port = process.env.PORT || 4000;
const dbPath = path.join(__dirname, 'kpop.db');
const db = new Database(dbPath);

app.use(cors());
app.use(express.json({ limit: '1mb' }));

const distPath = path.join(__dirname, '..', 'dist');
const hasDist = require('fs').existsSync(distPath);

if (hasDist) {
  app.use(express.static(distPath));
}

const initDb = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_name TEXT NOT NULL,
      player_name TEXT NOT NULL,
      score INTEGER NOT NULL,
      total INTEGER NOT NULL,
      answers TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_name TEXT UNIQUE NOT NULL,
      host_name TEXT NOT NULL,
      questions TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
};

initDb();

app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'K-pop quiz backend is running.' });
});

app.get('/api/leaderboard', (req, res) => {
  const roomName = (req.query.room || '').trim();

  const rows = db.prepare(
    roomName
      ? 'SELECT player_name, score, total, answers, created_at FROM records WHERE room_name = ? ORDER BY score DESC, created_at ASC LIMIT 20'
      : 'SELECT room_name, player_name, score, total, answers, created_at FROM records ORDER BY score DESC, created_at ASC LIMIT 20'
  ).all(roomName || undefined);

  res.json(rows);
});

app.post('/api/records', (req, res) => {
  const { roomName, playerName, score, total, answers } = req.body || {};

  if (!roomName || !playerName || Number.isNaN(Number(score)) || Number.isNaN(Number(total))) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  const stmt = db.prepare(`
    INSERT INTO records (room_name, player_name, score, total, answers, created_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
  `);

  const result = stmt.run(String(roomName), String(playerName), Number(score), Number(total), JSON.stringify(answers || []));

  res.status(201).json({ id: result.lastInsertRowid });
});

app.get('/api/room/:roomName', (req, res) => {
  const { roomName } = req.params;
  const row = db.prepare('SELECT host_name, questions FROM rooms WHERE room_name = ?').get(roomName);

  if (!row) {
    return res.status(404).json({ error: 'Room not found.' });
  }

  res.json({ roomName, hostName: row.host_name, questions: JSON.parse(row.questions) });
});

app.post('/api/room', (req, res) => {
  const { roomName, hostName, questions } = req.body || {};

  if (!roomName || !hostName || !Array.isArray(questions)) {
    return res.status(400).json({ error: 'Room name, host name, and questions are required.' });
  }

  const stmt = db.prepare(`
    INSERT INTO rooms (room_name, host_name, questions, updated_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(room_name) DO UPDATE SET
      host_name = excluded.host_name,
      questions = excluded.questions,
      updated_at = datetime('now')
  `);

  stmt.run(String(roomName), String(hostName), JSON.stringify(questions));

  res.status(200).json({ ok: true, roomName });
});

if (hasDist) {
  app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(port, () => {
  console.log(`K-pop quiz backend listening on http://localhost:${port}`);
});
