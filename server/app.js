require('dotenv').config();

const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const { db, mapUser, mapReport } = require('./db');
const {
  normalizeEmail,
  createPasswordHash,
  verifyPassword,
  signSession,
  readSessionToken,
  verifySession,
  setSessionCookie,
  clearSessionCookie
} = require('./auth');
const { getAiStatus, generateReport, generateChatReply } = require('./ai');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';

app.set('trust proxy', 1);

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use('/assets', express.static(path.join(process.cwd(), 'assets')));
app.use('/css', express.static(path.join(process.cwd(), 'css')));
app.use('/js', express.static(path.join(process.cwd(), 'js')));

function createRateLimiter({ windowMs, max, message }) {
  const hits = new Map();

  return (req, res, next) => {
    const now = Date.now();
    const key = `${req.ip}:${req.path}`;
    const current = hits.get(key);

    if (!current || current.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    current.count += 1;
    if (current.count > max) {
      res.set('Retry-After', String(Math.ceil((current.resetAt - now) / 1000)));
      res.status(429).json({ error: message || 'Too many requests. Please try again soon.' });
      return;
    }

    next();
  };
}

const authRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many login attempts. Please wait a few minutes and try again.'
});

const aiRateLimit = createRateLimiter({
  windowMs: 60 * 1000,
  max: 12,
  message: 'Vita is getting a lot of requests. Please wait a moment and try again.'
});

const analyticsRateLimit = createRateLimiter({
  windowMs: 60 * 1000,
  max: 60
});

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

function serializeUser(user) {
  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    onboardingComplete: user.onboardingComplete,
    checkInFrequency: user.checkInFrequency,
    profile: user.profile || {},
    lastCheckIn: user.lastCheckIn,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

function getUserById(id) {
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  return mapUser(row);
}

function authRequired(req, res, next) {
  const token = readSessionToken(req);
  const payload = verifySession(token);

  if (!payload?.userId) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  const user = getUserById(payload.userId);
  if (!user) {
    clearSessionCookie(res);
    res.status(401).json({ error: 'Session expired.' });
    return;
  }

  req.user = user;
  next();
}

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    app: 'Fitnessify AI',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/auth/session', (req, res) => {
  const token = readSessionToken(req);
  const payload = verifySession(token);
  const user = payload?.userId ? getUserById(payload.userId) : null;

  res.json({ user: serializeUser(user) });
});

app.post('/api/auth/signup', authRateLimit, (req, res) => {
  const name = String(req.body?.name || '').trim();
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || '');

  if (!name || !email || !password) {
    res.status(400).json({ error: 'Name, email, and password are required.' });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters.' });
    return;
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    res.status(409).json({ error: 'An account with this email already exists.' });
    return;
  }

  const now = new Date().toISOString();
  const result = db
    .prepare(
      `
      INSERT INTO users (name, email, password_hash, onboarding_complete, check_in_frequency, profile_json, created_at, updated_at)
      VALUES (?, ?, ?, 0, 'weekly', ?, ?, ?)
    `
    )
    .run(name, email, createPasswordHash(password), JSON.stringify({}), now, now);

  const token = signSession(result.lastInsertRowid);
  setSessionCookie(res, token);

  res.status(201).json({ user: serializeUser(getUserById(result.lastInsertRowid)) });
});

app.post('/api/auth/login', authRateLimit, (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || '');

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }

  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!row || !verifyPassword(password, row.password_hash)) {
    res.status(401).json({ error: 'Invalid email or password.' });
    return;
  }

  const token = signSession(row.id);
  setSessionCookie(res, token);

  res.json({ user: serializeUser(mapUser(row)) });
});

app.post('/api/auth/logout', (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

app.get('/api/profile', authRequired, (req, res) => {
  res.json({ profile: req.user.profile || {} });
});

app.get('/api/ai/status', authRequired, (_req, res) => {
  const status = getAiStatus();
  res.json({
    ...status,
    message: status.connected
      ? 'Vita is connected to live AI.'
      : 'Vita is using offline fallback replies until OPENROUTER_API_KEY is configured.'
  });
});

app.put('/api/profile', authRequired, (req, res) => {
  const incomingProfile =
    req.body?.profile && typeof req.body.profile === 'object' ? req.body.profile : {};
  const onboardingComplete = Boolean(req.body?.onboardingComplete);
  const mergedProfile = { ...(req.user.profile || {}), ...incomingProfile };
  const now = new Date().toISOString();

  db.prepare(
    `
      UPDATE users
      SET profile_json = ?, onboarding_complete = ?, updated_at = ?
      WHERE id = ?
    `
  ).run(JSON.stringify(mergedProfile), onboardingComplete ? 1 : req.user.onboardingComplete ? 1 : 0, now, req.user.id);

  res.json({ user: serializeUser(getUserById(req.user.id)) });
});

app.put('/api/checkin/frequency', authRequired, (req, res) => {
  const allowed = new Set(['daily', 'weekly', 'biweekly', 'monthly']);
  const frequency = String(req.body?.frequency || '').trim();

  if (!allowed.has(frequency)) {
    res.status(400).json({ error: 'Invalid check-in frequency.' });
    return;
  }

  db.prepare('UPDATE users SET check_in_frequency = ?, updated_at = ? WHERE id = ?').run(
    frequency,
    new Date().toISOString(),
    req.user.id
  );

  res.json({ user: serializeUser(getUserById(req.user.id)) });
});

app.get('/api/reports/latest', authRequired, (req, res) => {
  const row = db
    .prepare('SELECT * FROM reports WHERE user_id = ? ORDER BY datetime(created_at) DESC LIMIT 1')
    .get(req.user.id);

  res.json({ report: mapReport(row) });
});

app.get('/api/reports', authRequired, (req, res) => {
  const rows = db
    .prepare('SELECT * FROM reports WHERE user_id = ? ORDER BY datetime(created_at) DESC')
    .all(req.user.id);

  res.json({ reports: rows.map(mapReport) });
});

app.post('/api/reports/generate', authRequired, aiRateLimit, asyncHandler(async (req, res) => {
  const report = await generateReport(req.user);
  const nowIso = new Date().toISOString();
  const nowMs = Date.now();

  db.prepare('INSERT INTO reports (user_id, report_json, created_at) VALUES (?, ?, ?)').run(
    req.user.id,
    JSON.stringify(report),
    nowIso
  );

  db.prepare('UPDATE users SET last_check_in = ?, updated_at = ? WHERE id = ?').run(
    nowMs,
    nowIso,
    req.user.id
  );

  res.json({ report: mapReport(db.prepare('SELECT * FROM reports WHERE user_id = ? ORDER BY id DESC LIMIT 1').get(req.user.id)) });
}));

app.post('/api/chat', authRequired, aiRateLimit, asyncHandler(async (req, res) => {
  const messages = Array.isArray(req.body?.messages)
    ? req.body.messages
        .filter((message) => message && typeof message.content === 'string')
        .slice(-12)
        .map((message) => ({
          role: message.role === 'assistant' ? 'assistant' : 'user',
          content: message.content.trim()
        }))
        .filter((message) => message.content)
    : [];

  if (!messages.length) {
    res.status(400).json({ error: 'At least one message is required.' });
    return;
  }

  const reply = await generateChatReply(req.user, messages);
  res.json({ reply });
}));

app.post('/api/analytics/event', analyticsRateLimit, (req, res) => {
  const eventName = String(req.body?.event || '').trim().slice(0, 80);
  const metadata =
    req.body?.metadata && typeof req.body.metadata === 'object' ? req.body.metadata : {};

  if (!eventName || !/^[a-z0-9_.:-]+$/i.test(eventName)) {
    res.status(400).json({ error: 'Valid event name is required.' });
    return;
  }

  const token = readSessionToken(req);
  const payload = verifySession(token);
  const userId = payload?.userId ? Number(payload.userId) : null;

  db.prepare(
    'INSERT INTO analytics_events (user_id, event_name, metadata_json, created_at) VALUES (?, ?, ?, ?)'
  ).run(userId, eventName, JSON.stringify(metadata), new Date().toISOString());

  res.json({ ok: true });
});

app.get('/', (_req, res) => {
  res.sendFile(path.join(process.cwd(), 'index.html'));
});

app.get('/index.html', (_req, res) => {
  res.sendFile(path.join(process.cwd(), 'index.html'));
});

app.get('/onboarding.html', (_req, res) => {
  res.sendFile(path.join(process.cwd(), 'onboarding.html'));
});

app.get('/dashboard.html', (_req, res) => {
  res.sendFile(path.join(process.cwd(), 'dashboard.html'));
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

app.listen(PORT, HOST, () => {
  console.log(`Fitnessify AI is running on http://${HOST}:${PORT}`);
});
