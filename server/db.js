const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(process.cwd(), 'data', 'fitnessify.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    onboarding_complete INTEGER NOT NULL DEFAULT 0,
    check_in_frequency TEXT NOT NULL DEFAULT 'weekly',
    profile_json TEXT,
    last_check_in INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    report_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS analytics_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    event_name TEXT NOT NULL,
    metadata_json TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  );
`);

function parseJson(value, fallback = null) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function mapUser(row) {
  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    onboardingComplete: Boolean(row.onboarding_complete),
    checkInFrequency: row.check_in_frequency,
    profile: parseJson(row.profile_json, {}),
    lastCheckIn: row.last_check_in,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapReport(row) {
  if (!row) return null;

  return {
    id: row.id,
    date: row.created_at,
    data: parseJson(row.report_json, {})
  };
}

module.exports = {
  db,
  mapUser,
  mapReport
};
