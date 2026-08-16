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
  idleTimeoutMillis: 15000,
  connectionTimeoutMillis: 15000,
  keepAlive: true,
  ssl: /supabase\.(co|com)/i.test(databaseUrl)
    ? { rejectUnauthorized: false }
    : undefined,
});

pool.on('error', (err) => {
  console.error('Postgres pool error:', err.message);
});

const isRetryableDbError = (err) => {
  const msg = String(err && err.message || '');
  return /terminat|ECONNRESET|ETIMEDOUT|not queryable|Connection|ssl|timeout|went away/i.test(msg);
};

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
  try {
    const result = await pool.query(sql, params);
    return result.rows;
  } catch (error) {
    if (!isRetryableDbError(error)) throw error;
    const result = await pool.query(sql, params);
    return result.rows;
  }
};

const queryOne = async (sql, params = []) => {
  const rows = await query(sql, params);
  return rows[0] || null;
};

const getAuthUser = async (req) => {
  const header = String(req.headers.authorization || '');
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) return null;
  return queryOne(
    'SELECT id, nickname FROM users WHERE token = $1 AND (token_expires_at IS NULL OR token_expires_at > NOW())',
    [token]
  );
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

app.set('trust proxy', 1);

// Rate limiting
const rateLimitStore = new Map();
const rateLimit = (maxRequests = 100, windowMs = 60000, bucket = 'global') => (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const limit = rateLimitStore.get(key) || { count: 0, resetTime: now + windowMs };
  if (now > limit.resetTime) {
    limit.count = 0;
    limit.resetTime = now + windowMs;
  }
  limit.count++;
  rateLimitStore.set(key, limit);
  if (rateLimitStore.size > 8000) {
    for (const [storedKey, value] of rateLimitStore) {
      if (now > value.resetTime) rateLimitStore.delete(storedKey);
    }
  }
  if (limit.count > maxRequests) {
    return res.status(429).json({ error: '请求过于频繁，请稍后再试。' });
  }
  next();
};

// CORS config
const allowedOrigins = [
  'https://louisprincee.github.io',
  'http://localhost:3000',
  'http://localhost:5173',
  process.env.ALLOWED_ORIGIN
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
      callback(null, true);
      return;
    }
    callback(null, false);
  },
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));
app.use(rateLimit(100, 60000, 'global'));

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
      token_expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_users_token ON users(token);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_records_room_player
      ON records(room_name, player_name);
  `);

  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ
  `);
};

app.get('/api/health', asyncRoute(async (_req, res) => {
  await pool.query('SELECT 1');
  res.json({ ok: true, message: 'K-pop quiz backend is running.', db: 'supabase' });
}));

app.post('/api/auth', rateLimit(15, 60000, 'auth'), asyncRoute(async (req, res) => {
  const nickname = String(req.body?.nickname || '').trim();
  const password = String(req.body?.password || '');

  if (!nickname || nickname.length < 1 || nickname.length > 20) {
    return res.status(400).json({ error: '昵称长度需要1-20个字符。', code: 'NICKNAME_INVALID' });
  }
  if (password.length < 4 || password.length > 50) {
    return res.status(400).json({ error: '密码长度需要4-50个字符。', code: 'PASSWORD_INVALID' });
  }

  const existing = await queryOne('SELECT * FROM users WHERE nickname = $1', [nickname]);
  if (existing) {
    if (!verifyPassword(password, existing.password_salt, existing.password_hash)) {
      return res.status(401).json({ error: '密码错误或者昵称已经被人使用咯。', code: 'AUTH_FAILED' });
    }
    const token = newToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await query('UPDATE users SET token = $1, token_expires_at = $2 WHERE id = $3', [token, expiresAt, existing.id]);
    return res.json({ nickname: existing.nickname, token });
  }

  const { salt, hash } = hashPassword(password);
  const token = newToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await query(
    'INSERT INTO users (nickname, password_salt, password_hash, token, token_expires_at) VALUES ($1, $2, $3, $4, $5)',
    [nickname, salt, hash, token, expiresAt]
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
  if (!roomName) {
    return res.status(400).json({ error: 'Room is required.' });
  }
  const rows = await query(
    'SELECT player_name, score, total, created_at FROM records WHERE room_name = $1 ORDER BY score DESC, created_at ASC LIMIT 50',
    [roomName]
  );

  res.json(rows);
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

  const { roomName, answers } = req.body || {};
  const playerName = user.nickname;
  const trimmedRoom = String(roomName || '').trim();

  if (!trimmedRoom) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  const room = await queryOne('SELECT host_name, questions FROM rooms WHERE room_name = $1', [trimmedRoom]);
  if (!room) {
    return res.status(404).json({ error: 'Room not found.' });
  }
  if (room.host_name === playerName) {
    return res.status(403).json({ error: '房主不能用同一个昵称答题。', code: 'HOST_NICKNAME' });
  }

  const already = await queryOne(
    'SELECT id FROM records WHERE room_name = $1 AND player_name = $2',
    [trimmedRoom, playerName]
  );
  if (already) {
    return res.status(409).json({ error: '已经交过卷了。', code: 'ALREADY_PLAYED' });
  }

  const questions = parseQuestions(room.questions);
  const packed = Array.isArray(answers) ? answers : [];
  const total = questions.length;
  const score = questions.reduce((sum, question, index) => (
    sum + (packed[index] === question.correctIndex ? 1 : 0)
  ), 0);

  const row = await queryOne(`
    INSERT INTO records (room_name, player_name, score, total, answers, created_at)
    VALUES ($1, $2, $3, $4, $5, NOW())
    RETURNING id
  `, [
    trimmedRoom,
    String(playerName).trim(),
    score,
    total,
    JSON.stringify(packed),
  ]);

  res.status(201).json({ id: row?.id, score, total });
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
  
  if (trimmedRoom.length > 30) {
    return res.status(400).json({ error: '房间名最多30个字符。' });
  }
  
  if (questions.length > 50) {
    return res.status(400).json({ error: '题目数最多50题。' });
  }

  const existing = await queryOne('SELECT host_name FROM rooms WHERE room_name = $1', [trimmedRoom]);
  if (existing && existing.host_name !== hostName) {
    return res.status(409).json({ error: '房间名已被占用。', code: 'ROOM_TAKEN' });
  }

  // Check if room has records
  if (existing) {
    const hasRecords = await queryOne(
      'SELECT id FROM records WHERE room_name = $1 LIMIT 1',
      [trimmedRoom]
    );
    if (hasRecords) {
      return res.status(409).json({ 
        error: '房间已有人交卷，不能再修改题目。', 
        code: 'ROOM_HAS_RECORDS' 
      });
    }
  }

  const packedQuestions = questions.map((question, index) => ({
    id: question.id || `q-${index + 1}`,
    category: String(question.category || 'K-pop').slice(0, 80),
    prompt: String(question.prompt || '').slice(0, 500),
    options: (Array.isArray(question.options) ? question.options : []).slice(0, 4).map((option) => String(option || '').slice(0, 100)),
    correctIndex: Number.isInteger(question.correctIndex) ? question.correctIndex : null,
  }));

  await query(`
    INSERT INTO rooms (room_name, host_name, questions, updated_at)
    VALUES ($1, $2, $3, NOW())
    ON CONFLICT (room_name) DO UPDATE SET
      questions = EXCLUDED.questions,
      updated_at = NOW()
    WHERE rooms.host_name = EXCLUDED.host_name
  `, [trimmedRoom, String(hostName).trim(), JSON.stringify(packedQuestions)]);

  res.status(200).json({ ok: true, roomName: trimmedRoom });
}));

if (hasDist) {
  app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.use((err, _req, res, _next) => {
  console.error('[ERROR]', new Date().toISOString(), {
    message: err.message,
    stack: err.stack,
    status: err.status || 500
  });
  const statusCode = err.status || 500;
  res.status(statusCode).json({ 
    error: statusCode === 500 ? '服务器出错了，请稍后再试。' : err.message 
  });
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
