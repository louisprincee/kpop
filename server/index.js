const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 4000;
const databaseUrl = String(process.env.DATABASE_URL || '').trim();

if (!databaseUrl) {
  console.error('Missing DATABASE_URL. Put your Supabase Session pooler URI in server/.env');
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl,
  max: 5,
  ssl: /supabase\.(co|com)/i.test(databaseUrl)
    ? { rejectUnauthorized: false }
    : undefined,
});

const hashPassword = (password, salt = crypto.randomBytes(16).toString('hex')) => {
  const hash = crypto.scryptSync(String(password), salt, 32).toString('hex');
  return { salt, hash };
};

const verifyPassword = (password, salt, hash) => {
  try {
    const next = crypto.scryptSync(String(password), salt, 32);
    const prev = Buffer.from(String(hash), 'hex');
    if (next.length !== prev.length) return false;
    return crypto.timingSafeEqual(next, prev);
  } catch {
    return false;
  }
};

const newToken = () => crypto.randomBytes(24).toString('hex');

const query = async (sql, params = []) => {
  const result = await pool.query(sql, params);
  return result.rows;
};

const queryOne = async (sql, params = []) => {
  const rows = await query(sql, params);
  return rows[0] || null;
};

const getAuthUser = async (req) => {
  const header = String(req.headers.authorization || '');
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) return null;
  return queryOne('SELECT id, nickname FROM users WHERE token = $1', [token]);
};

const requireUser = async (req, res) => {
  const user = await getAuthUser(req);
  if (!user) {
    res.status(401).json({ error: '请先登录。', code: 'UNAUTHORIZED' });
    return null;
  }
  return user;
};

const asyncRoute = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

app.use(cors());
app.use(express.json({ limit: '1mb' }));

const distPath = path.join(__dirname, '..', 'dist');
const hasDist = fs.existsSync(distPath);

if (hasDist) {
  app.use(express.static(distPath));
}

const parseAnswers = (raw) => {
  if (Array.isArray(raw)) return raw;
  try {
    return JSON.parse(raw || '[]');
  } catch {
    return [];
  }
};

const parseQuestions = (raw) => {
  if (Array.isArray(raw)) return raw;
  try {
    return JSON.parse(raw || '[]');
  } catch {
    return [];
  }
};

const initDb = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS records (
      id SERIAL PRIMARY KEY,
      room_name TEXT NOT NULL,
      player_name TEXT NOT NULL,
      score INTEGER NOT NULL,
      total INTEGER NOT NULL,
      answers TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS rooms (
      id SERIAL PRIMARY KEY,
      room_name TEXT UNIQUE NOT NULL,
      host_name TEXT NOT NULL,
      questions TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      nickname TEXT UNIQUE NOT NULL,
      password_salt TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      token TEXT UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_users_token ON users(token);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_records_room_player
      ON records(room_name, player_name);
  `);
};

app.get('/api/health', asyncRoute(async (_req, res) => {
  await pool.query('SELECT 1');
  res.json({ ok: true, message: 'K-pop quiz backend is running.', db: 'supabase' });
}));

app.post('/api/auth', asyncRoute(async (req, res) => {
  const nickname = String(req.body?.nickname || '').trim();
  const password = String(req.body?.password || '');

  if (!nickname) {
    return res.status(400).json({ error: '请输入昵称。', code: 'NICKNAME_REQUIRED' });
  }
  if (password.length < 4) {
    return res.status(400).json({ error: '密码至少 4 位。', code: 'PASSWORD_SHORT' });
  }

  const existing = await queryOne('SELECT * FROM users WHERE nickname = $1', [nickname]);
  if (existing) {
    if (!verifyPassword(password, existing.password_salt, existing.password_hash)) {
      return res.status(401).json({ error: '这个昵称已经有人用了，请换一个或输入正确密码。', code: 'NICKNAME_TAKEN' });
    }
    const token = newToken();
    await query('UPDATE users SET token = $1 WHERE id = $2', [token, existing.id]);
    return res.json({ nickname: existing.nickname, token });
  }

  const { salt, hash } = hashPassword(password);
  const token = newToken();
  await query(
    'INSERT INTO users (nickname, password_salt, password_hash, token) VALUES ($1, $2, $3, $4)',
    [nickname, salt, hash, token]
  );

  res.status(201).json({ nickname, token });
}));

app.get('/api/me', asyncRoute(async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const name = user.nickname;

  const hosted = await query(`
    SELECT room_name, host_name, updated_at,
      (SELECT COUNT(*) FROM records WHERE records.room_name = rooms.room_name) AS player_count
    FROM rooms
    WHERE host_name = $1
    ORDER BY updated_at DESC
  `, [name]);

  const played = await query(`
    SELECT r.room_name, rooms.host_name, r.score, r.total, r.answers, r.created_at, rooms.questions
    FROM records r
    JOIN rooms ON rooms.room_name = r.room_name
    WHERE r.player_name = $1
    ORDER BY r.created_at DESC
  `, [name]);

  res.json({
    nickname: name,
    hosted: hosted.map((row) => ({
      roomName: row.room_name,
      hostName: row.host_name,
      updatedAt: row.updated_at,
      playerCount: Number(row.player_count) || 0,
    })),
    played: played.map((row) => ({
      roomName: row.room_name,
      hostName: row.host_name,
      score: row.score,
      total: row.total,
      answers: parseAnswers(row.answers),
      questions: parseQuestions(row.questions),
      createdAt: row.created_at,
    })),
  });
}));

app.get('/api/leaderboard', asyncRoute(async (req, res) => {
  const roomName = (req.query.room || '').trim();
  const rows = roomName
    ? await query(
      'SELECT player_name, score, total, answers, created_at FROM records WHERE room_name = $1 ORDER BY score DESC, created_at ASC LIMIT 50',
      [roomName]
    )
    : await query(
      'SELECT room_name, player_name, score, total, answers, created_at FROM records ORDER BY score DESC, created_at ASC LIMIT 50'
    );

  res.json(rows.map((row) => ({ ...row, answers: parseAnswers(row.answers) })));
}));

app.get('/api/room/:roomName/results', asyncRoute(async (req, res) => {
  const roomName = decodeURIComponent(req.params.roomName || '').trim();
  const room = await queryOne('SELECT host_name, questions FROM rooms WHERE room_name = $1', [roomName]);

  if (!room) {
    return res.status(404).json({ error: 'Room not found.' });
  }

  const records = await query(
    'SELECT player_name, score, total, answers, created_at FROM records WHERE room_name = $1 ORDER BY score DESC, created_at ASC',
    [roomName]
  );

  res.json({
    roomName,
    hostName: room.host_name,
    questions: parseQuestions(room.questions),
    records: records.map((row) => ({
      playerName: row.player_name,
      score: row.score,
      total: row.total,
      answers: parseAnswers(row.answers),
      createdAt: row.created_at,
    })),
  });
}));

app.post('/api/records', asyncRoute(async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;

  const { roomName, score, total, answers } = req.body || {};
  const playerName = user.nickname;

  if (!roomName || Number.isNaN(Number(score)) || Number.isNaN(Number(total))) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  const row = await queryOne(`
    INSERT INTO records (room_name, player_name, score, total, answers, created_at)
    VALUES ($1, $2, $3, $4, $5, NOW())
    ON CONFLICT (room_name, player_name) DO UPDATE SET
      score = EXCLUDED.score,
      total = EXCLUDED.total,
      answers = EXCLUDED.answers,
      created_at = NOW()
    RETURNING id
  `, [
    String(roomName).trim(),
    String(playerName).trim(),
    Number(score),
    Number(total),
    JSON.stringify(answers || []),
  ]);

  res.status(201).json({ id: row?.id });
}));

app.get('/api/room/:roomName', asyncRoute(async (req, res) => {
  const roomName = decodeURIComponent(req.params.roomName || '').trim();
  const row = await queryOne('SELECT host_name, questions FROM rooms WHERE room_name = $1', [roomName]);

  if (!row) {
    return res.status(404).json({ error: 'Room not found.' });
  }

  res.json({ roomName, hostName: row.host_name, questions: parseQuestions(row.questions) });
}));

app.post('/api/room', asyncRoute(async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;

  const { roomName, questions } = req.body || {};
  const hostName = user.nickname;
  const trimmedRoom = String(roomName || '').trim();

  if (!trimmedRoom || !Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ error: 'Room name, host name, and questions are required.' });
  }

  const existing = await queryOne('SELECT host_name FROM rooms WHERE room_name = $1', [trimmedRoom]);
  if (existing && existing.host_name !== hostName) {
    return res.status(409).json({ error: '房间名已被占用。', code: 'ROOM_TAKEN' });
  }

  await query(`
    INSERT INTO rooms (room_name, host_name, questions, updated_at)
    VALUES ($1, $2, $3, NOW())
    ON CONFLICT (room_name) DO UPDATE SET
      host_name = EXCLUDED.host_name,
      questions = EXCLUDED.questions,
      updated_at = NOW()
  `, [trimmedRoom, String(hostName).trim(), JSON.stringify(questions)]);

  res.status(200).json({ ok: true, roomName: trimmedRoom });
}));

if (hasDist) {
  app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: '服务器出错了，请稍后再试。' });
});

const start = async () => {
  await initDb();
  app.listen(port, () => {
    console.log(`K-pop quiz backend listening on http://localhost:${port}`);
    console.log('Database: Supabase Postgres');
  });
};

start().catch((error) => {
  console.error('Failed to start backend:', error.message);
  process.exit(1);
});
