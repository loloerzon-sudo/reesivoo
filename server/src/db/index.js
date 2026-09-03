import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure data directory exists
const dataDir = path.resolve(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'app.db');
const db = new Database(dbPath);

// Enable WAL mode
db.pragma('journal_mode = WAL');

// Recreate clean Google OAuth users table
try {
  const tableInfo = db.prepare('PRAGMA table_info(users)').all();
  const columnNames = tableInfo.map((col) => col.name);
  if (!columnNames.includes('google_id')) {
    db.exec('DROP TABLE IF EXISTS users');
  }
} catch (_) {}

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    google_id TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    name TEXT,
    avatar_url TEXT,
    access_token TEXT,
    refresh_token TEXT,
    token_expiry INTEGER,
    target_sheet_id TEXT,
    target_folder_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS temp_uploads (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

export const userQueries = {
  getUserById(id) {
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  },

  getUserByGoogleId(googleId) {
    return db.prepare('SELECT * FROM users WHERE google_id = ?').get(googleId);
  },

  upsertUser({ google_id, email, name, avatar_url, access_token, refresh_token, token_expiry }) {
    const existing = db.prepare('SELECT * FROM users WHERE google_id = ?').get(google_id);
    if (existing) {
      const newRefreshToken = refresh_token || existing.refresh_token;
      db.prepare(`
        UPDATE users 
        SET email = ?, name = ?, avatar_url = ?, access_token = ?, refresh_token = ?, token_expiry = ?, updated_at = CURRENT_TIMESTAMP
        WHERE google_id = ?
      `).run(email, name, avatar_url, access_token, newRefreshToken, token_expiry, google_id);
      return db.prepare('SELECT * FROM users WHERE google_id = ?').get(google_id);
    } else {
      const info = db.prepare(`
        INSERT INTO users (google_id, email, name, avatar_url, access_token, refresh_token, token_expiry)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(google_id, email, name, avatar_url, access_token, refresh_token, token_expiry);
      return db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
    }
  },

  updateUserTokens(id, { access_token, refresh_token, token_expiry }) {
    if (refresh_token) {
      db.prepare(`
        UPDATE users 
        SET access_token = ?, refresh_token = ?, token_expiry = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(access_token, refresh_token, token_expiry, id);
    } else {
      db.prepare(`
        UPDATE users 
        SET access_token = ?, token_expiry = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(access_token, token_expiry, id);
    }
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  },

  updateUserTargets(id, { target_sheet_id, target_folder_id }) {
    db.prepare(`
      UPDATE users 
      SET target_sheet_id = COALESCE(?, target_sheet_id), 
          target_folder_id = COALESCE(?, target_folder_id), 
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(target_sheet_id, target_folder_id, id);
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  }
};

export const uploadQueries = {
  createTempUpload({ id, user_id, file_path, original_name, mime_type }) {
    db.prepare(`
      INSERT INTO temp_uploads (id, user_id, file_path, original_name, mime_type)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, user_id, file_path, original_name, mime_type);
    return db.prepare('SELECT * FROM temp_uploads WHERE id = ?').get(id);
  },

  getTempUpload(id) {
    return db.prepare('SELECT * FROM temp_uploads WHERE id = ?').get(id);
  },

  deleteTempUpload(id) {
    return db.prepare('DELETE FROM temp_uploads WHERE id = ?').run(id);
  }
};

export default db;
