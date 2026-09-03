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

// Ensure tables exist
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
    scan_credits INTEGER DEFAULT 10,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS coupons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    credits INTEGER NOT NULL,
    max_uses INTEGER DEFAULT 1,
    times_used INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS coupon_redemptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    coupon_id INTEGER NOT NULL,
    redeemed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE,
    UNIQUE(user_id, coupon_id)
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

// Safe column migration: add scan_credits if not present
try {
  const tableInfo = db.prepare('PRAGMA table_info(users)').all();
  const columnNames = tableInfo.map((col) => col.name);
  if (!columnNames.includes('scan_credits')) {
    db.exec('ALTER TABLE users ADD COLUMN scan_credits INTEGER DEFAULT 10');
  }
} catch (_) {}

// Seed starter promotional coupons if empty
try {
  const count = db.prepare('SELECT COUNT(*) as count FROM coupons').get();
  if (count.count === 0) {
    const insert = db.prepare('INSERT OR IGNORE INTO coupons (code, credits, max_uses) VALUES (?, ?, ?)');
    insert.run('WELCOME10', 10, 10000); // 10 free scans promo
    insert.run('VIP-ERZON', 1000, 10);   // VIP creator code
    insert.run('GCASH100-SAMPLE', 100, 1); // 1-time 100-scan voucher
  }
} catch (_) {}

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
        INSERT INTO users (google_id, email, name, avatar_url, access_token, refresh_token, token_expiry, scan_credits)
        VALUES (?, ?, ?, ?, ?, ?, ?, 10)
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
  },

  deductUserCredit(id) {
    const user = db.prepare('SELECT scan_credits FROM users WHERE id = ?').get(id);
    if (!user || user.scan_credits <= 0) {
      throw new Error('No scan credits remaining');
    }
    db.prepare('UPDATE users SET scan_credits = scan_credits - 1 WHERE id = ?').run(id);
    const updated = db.prepare('SELECT scan_credits FROM users WHERE id = ?').get(id);
    return updated.scan_credits;
  },

  addUserCredits(id, creditsToAdd) {
    db.prepare('UPDATE users SET scan_credits = scan_credits + ? WHERE id = ?').run(creditsToAdd, id);
    const updated = db.prepare('SELECT scan_credits FROM users WHERE id = ?').get(id);
    return updated.scan_credits;
  },

  getAllUsers() {
    return db.prepare('SELECT id, email, name, avatar_url, scan_credits, created_at FROM users ORDER BY id DESC').all();
  },

  setUserCredits(id, credits) {
    db.prepare('UPDATE users SET scan_credits = ? WHERE id = ?').run(credits, id);
    return db.prepare('SELECT id, email, scan_credits FROM users WHERE id = ?').get(id);
  }
};

export const couponQueries = {
  getCouponByCode(code) {
    const normalized = (code || '').trim().toUpperCase();
    return db.prepare('SELECT * FROM coupons WHERE code = ? AND is_active = 1').get(normalized);
  },

  getAllCouponsWithDetails() {
    const coupons = db.prepare(`
      SELECT c.*, 
             r.user_id as redeemed_by_user_id, 
             r.redeemed_at,
             u.email as redeemed_by_email,
             u.name as redeemed_by_name
      FROM coupons c
      LEFT JOIN coupon_redemptions r ON c.id = r.coupon_id
      LEFT JOIN users u ON r.user_id = u.id
      ORDER BY c.id DESC
    `).all();
    return coupons;
  },

  hasUserRedeemed(userId, couponId) {
    const row = db.prepare('SELECT 1 FROM coupon_redemptions WHERE user_id = ? AND coupon_id = ?').get(userId, couponId);
    return !!row;
  },

  redeemCoupon(userId, code) {
    const normalized = (code || '').trim().toUpperCase();
    const coupon = db.prepare('SELECT * FROM coupons WHERE code = ? AND is_active = 1').get(normalized);

    if (!coupon) {
      throw new Error('Invalid or expired coupon code');
    }

    if (coupon.times_used >= coupon.max_uses) {
      throw new Error('This coupon code has already reached its maximum usage limit');
    }

    const alreadyRedeemed = db.prepare('SELECT 1 FROM coupon_redemptions WHERE user_id = ? AND coupon_id = ?').get(userId, coupon.id);
    if (alreadyRedeemed) {
      throw new Error('You have already redeemed this promo code');
    }

    // Atomic transaction: record redemption, increment times_used, add credits to user
    const redeemTransaction = db.transaction(() => {
      db.prepare('INSERT INTO coupon_redemptions (user_id, coupon_id) VALUES (?, ?)').run(userId, coupon.id);
      db.prepare('UPDATE coupons SET times_used = times_used + 1 WHERE id = ?').run(coupon.id);
      db.prepare('UPDATE users SET scan_credits = scan_credits + ? WHERE id = ?').run(coupon.credits, userId);
      const user = db.prepare('SELECT scan_credits FROM users WHERE id = ?').get(userId);
      return {
        addedCredits: coupon.credits,
        newTotalCredits: user.scan_credits,
        code: coupon.code
      };
    });

    return redeemTransaction();
  },

  createCoupon({ code, credits, max_uses = 1 }) {
    const normalized = (code || '').trim().toUpperCase();
    db.prepare('INSERT INTO coupons (code, credits, max_uses) VALUES (?, ?, ?)').run(normalized, credits, max_uses);
    return db.prepare('SELECT * FROM coupons WHERE code = ?').get(normalized);
  },

  createBatchCoupons({ prefix = 'GCASH', credits = 100, count = 5 }) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // human-readable without O/0/I/1
    const generated = [];

    const insertBatch = db.transaction(() => {
      const stmt = db.prepare('INSERT INTO coupons (code, credits, max_uses) VALUES (?, ?, 1)');
      for (let i = 0; i < count; i++) {
        let randomSuffix = '';
        for (let j = 0; j < 5; j++) {
          randomSuffix += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        const code = `${prefix}${credits}-${randomSuffix}`;
        stmt.run(code, credits);
        generated.push(code);
      }
    });

    insertBatch();
    return generated;
  },

  deleteCoupon(id) {
    db.prepare('DELETE FROM coupons WHERE id = ?').run(id);
    return { success: true };
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
