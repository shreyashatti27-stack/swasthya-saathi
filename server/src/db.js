import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, '../data.db');
const db = new DatabaseSync(dbPath);

// Enable foreign keys & WAL mode
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

// Initialize database schema
export function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('asha', 'phc_officer')),
      phc_name TEXT NOT NULL,
      phone TEXT
    );

    CREATE TABLE IF NOT EXISTS patients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asha_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      age INTEGER NOT NULL,
      gender TEXT NOT NULL CHECK(gender IN ('male', 'female', 'other')),
      village TEXT NOT NULL,
      phone TEXT,
      condition TEXT NOT NULL CHECK(condition IN ('hypertension', 'diabetes', 'both')),
      preferred_language TEXT NOT NULL DEFAULT 'hi' CHECK(preferred_language IN ('en', 'hi', 'kn')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS readings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      systolic INTEGER,
      diastolic INTEGER,
      blood_sugar REAL,
      sugar_type TEXT CHECK(sugar_type IN ('fasting', 'random')),
      risk_level TEXT NOT NULL CHECK(risk_level IN ('severe', 'uncontrolled', 'controlled')),
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS visits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      scheduled_date TEXT NOT NULL,
      completed_date DATETIME,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'done', 'missed')),
      reminder_sent INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      message TEXT NOT NULL,
      language TEXT NOT NULL CHECK(language IN ('en', 'hi', 'kn')),
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      channel TEXT NOT NULL DEFAULT 'sms' CHECK(channel IN ('sms', 'ivr'))
    );

    CREATE INDEX IF NOT EXISTS idx_patients_asha ON patients(asha_id);
    CREATE INDEX IF NOT EXISTS idx_readings_patient ON readings(patient_id);
    CREATE INDEX IF NOT EXISTS idx_visits_patient ON visits(patient_id);
    CREATE INDEX IF NOT EXISTS idx_visits_status ON visits(status);
    CREATE INDEX IF NOT EXISTS idx_visits_sched ON visits(scheduled_date);
  `);
}

/**
 * Update overdue visits to 'missed' if > 3 days past scheduled_date and still pending
 */
export function updateMissedVisits() {
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const cutoffStr = threeDaysAgo.toISOString().split('T')[0];

  const stmt = db.prepare(`
    UPDATE visits 
    SET status = 'missed' 
    WHERE status = 'pending' AND scheduled_date < ?
  `);
  return stmt.run(cutoffStr);
}

export default db;
