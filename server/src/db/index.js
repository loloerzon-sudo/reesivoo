import { createClient } from '@libsql/client';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure data directory exists (for local fallback)
const dataDir = path.resolve(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbUrl = process.env.TURSO_DATABASE_URL || `file:${path.join(dataDir, 'app.db')}`;
const authToken = process.env.TURSO_AUTH_TOKEN || undefined;

export const client = createClient({
  url: dbUrl,
  authToken: authToken,
});

// Ensure tables exist and seed initial coupons
export async function initDb() {
  await client.execute(`
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
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS coupons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      credits INTEGER NOT NULL,
      max_uses INTEGER DEFAULT 1,
      times_used INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS coupon_redemptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      coupon_id INTEGER NOT NULL,
      redeemed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE,
      UNIQUE(user_id, coupon_id)
    );
  `);

  await client.execute(`
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

  // Seed starter promotional coupons if empty
  try {
    const countRes = await client.execute('SELECT COUNT(*) as count FROM coupons');
    const count = Number(countRes.rows[0]?.count ?? 0);
    if (count === 0) {
      await client.batch([
        { sql: 'INSERT OR IGNORE INTO coupons (code, credits, max_uses) VALUES (?, ?, ?)', args: ['WELCOME10', 10, 10000] },
        { sql: 'INSERT OR IGNORE INTO coupons (code, credits, max_uses) VALUES (?, ?, ?)', args: ['VIP-ERZON', 1000, 10] },
        { sql: 'INSERT OR IGNORE INTO coupons (code, credits, max_uses) VALUES (?, ?, ?)', args: ['GCASH100-SAMPLE', 100, 1] },
      ], 'write');
    }
  } catch (err) {
    console.warn('Coupon seed notice:', err.message);
  }
}

export const userQueries = {
  async getUserById(id) {
    const res = await client.execute({ sql: 'SELECT * FROM users WHERE id = ?', args: [id] });
    return res.rows[0] || null;
  },

  async getUserByGoogleId(googleId) {
    const res = await client.execute({ sql: 'SELECT * FROM users WHERE google_id = ?', args: [googleId] });
    return res.rows[0] || null;
  },

  async upsertUser({ google_id, email, name, avatar_url, access_token, refresh_token, token_expiry }) {
    const existingRes = await client.execute({ sql: 'SELECT * FROM users WHERE google_id = ?', args: [google_id] });
    const existing = existingRes.rows[0];

    if (existing) {
      const newRefreshToken = refresh_token || existing.refresh_token;
      await client.execute({
        sql: `
          UPDATE users 
          SET email = ?, name = ?, avatar_url = ?, access_token = ?, refresh_token = ?, token_expiry = ?, updated_at = CURRENT_TIMESTAMP
          WHERE google_id = ?
        `,
        args: [email, name, avatar_url, access_token, newRefreshToken, token_expiry, google_id],
      });
      const updatedRes = await client.execute({ sql: 'SELECT * FROM users WHERE google_id = ?', args: [google_id] });
      return updatedRes.rows[0];
    } else {
      const info = await client.execute({
        sql: `
          INSERT INTO users (google_id, email, name, avatar_url, access_token, refresh_token, token_expiry, scan_credits)
          VALUES (?, ?, ?, ?, ?, ?, ?, 10)
        `,
        args: [google_id, email, name, avatar_url, access_token, refresh_token, token_expiry],
      });
      const newRes = await client.execute({ sql: 'SELECT * FROM users WHERE id = ?', args: [Number(info.lastInsertRowid)] });
      return newRes.rows[0];
    }
  },

  async updateUserTokens(id, { access_token, refresh_token, token_expiry }) {
    if (refresh_token) {
      await client.execute({
        sql: `
          UPDATE users 
          SET access_token = ?, refresh_token = ?, token_expiry = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        args: [access_token, refresh_token, token_expiry, id],
      });
    } else {
      await client.execute({
        sql: `
          UPDATE users 
          SET access_token = ?, token_expiry = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        args: [access_token, token_expiry, id],
      });
    }
    const res = await client.execute({ sql: 'SELECT * FROM users WHERE id = ?', args: [id] });
    return res.rows[0];
  },

  async updateUserTargets(id, { target_sheet_id, target_folder_id }) {
    await client.execute({
      sql: `
        UPDATE users 
        SET target_sheet_id = COALESCE(?, target_sheet_id), 
            target_folder_id = COALESCE(?, target_folder_id), 
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      args: [target_sheet_id, target_folder_id, id],
    });
    const res = await client.execute({ sql: 'SELECT * FROM users WHERE id = ?', args: [id] });
    return res.rows[0];
  },

  async deductUserCredit(id) {
    const userRes = await client.execute({ sql: 'SELECT scan_credits FROM users WHERE id = ?', args: [id] });
    const user = userRes.rows[0];
    if (!user || Number(user.scan_credits) <= 0) {
      throw new Error('No scan credits remaining');
    }
    await client.execute({ sql: 'UPDATE users SET scan_credits = scan_credits - 1 WHERE id = ?', args: [id] });
    const updatedRes = await client.execute({ sql: 'SELECT scan_credits FROM users WHERE id = ?', args: [id] });
    return updatedRes.rows[0]?.scan_credits;
  },

  async addUserCredits(id, creditsToAdd) {
    await client.execute({ sql: 'UPDATE users SET scan_credits = scan_credits + ? WHERE id = ?', args: [creditsToAdd, id] });
    const updatedRes = await client.execute({ sql: 'SELECT scan_credits FROM users WHERE id = ?', args: [id] });
    return updatedRes.rows[0]?.scan_credits;
  },

  async getAllUsers() {
    const res = await client.execute('SELECT id, email, name, avatar_url, scan_credits, created_at FROM users ORDER BY id DESC');
    return res.rows;
  },

  async setUserCredits(id, credits) {
    await client.execute({ sql: 'UPDATE users SET scan_credits = ? WHERE id = ?', args: [credits, id] });
    const res = await client.execute({ sql: 'SELECT id, email, scan_credits FROM users WHERE id = ?', args: [id] });
    return res.rows[0];
  },
};

export const couponQueries = {
  async getCouponByCode(code) {
    const normalized = (code || '').trim().toUpperCase();
    const res = await client.execute({ sql: 'SELECT * FROM coupons WHERE code = ? AND is_active = 1', args: [normalized] });
    return res.rows[0] || null;
  },

  async getAllCouponsWithDetails() {
    const res = await client.execute(`
      SELECT c.*, 
             r.user_id as redeemed_by_user_id, 
             r.redeemed_at,
             u.email as redeemed_by_email,
             u.name as redeemed_by_name
      FROM coupons c
      LEFT JOIN coupon_redemptions r ON c.id = r.coupon_id
      LEFT JOIN users u ON r.user_id = u.id
      ORDER BY c.id DESC
    `);
    return res.rows;
  },

  async hasUserRedeemed(userId, couponId) {
    const res = await client.execute({ sql: 'SELECT 1 FROM coupon_redemptions WHERE user_id = ? AND coupon_id = ?', args: [userId, couponId] });
    return res.rows.length > 0;
  },

  async redeemCoupon(userId, code) {
    const normalized = (code || '').trim().toUpperCase();
    const couponRes = await client.execute({ sql: 'SELECT * FROM coupons WHERE code = ? AND is_active = 1', args: [normalized] });
    const coupon = couponRes.rows[0];

    if (!coupon) {
      throw new Error('Invalid or expired coupon code');
    }

    if (coupon.times_used >= coupon.max_uses) {
      throw new Error('This coupon code has already reached its maximum usage limit');
    }

    const alreadyRedeemedRes = await client.execute({ sql: 'SELECT 1 FROM coupon_redemptions WHERE user_id = ? AND coupon_id = ?', args: [userId, coupon.id] });
    if (alreadyRedeemedRes.rows.length > 0) {
      throw new Error('You have already redeemed this promo code');
    }

    // Atomic transaction using client.batch
    await client.batch([
      { sql: 'INSERT INTO coupon_redemptions (user_id, coupon_id) VALUES (?, ?)', args: [userId, coupon.id] },
      { sql: 'UPDATE coupons SET times_used = times_used + 1 WHERE id = ?', args: [coupon.id] },
      { sql: 'UPDATE users SET scan_credits = scan_credits + ? WHERE id = ?', args: [coupon.credits, userId] },
    ], 'write');

    const userRes = await client.execute({ sql: 'SELECT scan_credits FROM users WHERE id = ?', args: [userId] });
    return {
      addedCredits: coupon.credits,
      newTotalCredits: userRes.rows[0]?.scan_credits,
      code: coupon.code,
    };
  },

  async createCoupon({ code, credits, max_uses = 1 }) {
    const normalized = (code || '').trim().toUpperCase();
    await client.execute({ sql: 'INSERT INTO coupons (code, credits, max_uses) VALUES (?, ?, ?)', args: [normalized, credits, max_uses] });
    const res = await client.execute({ sql: 'SELECT * FROM coupons WHERE code = ?', args: [normalized] });
    return res.rows[0];
  },

  async createBatchCoupons({ prefix = 'GCASH', credits = 100, count = 5 }) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const generated = [];
    const batchStatements = [];

    for (let i = 0; i < count; i++) {
      let randomSuffix = '';
      for (let j = 0; j < 5; j++) {
        randomSuffix += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const code = `${prefix}${credits}-${randomSuffix}`;
      batchStatements.push({
        sql: 'INSERT INTO coupons (code, credits, max_uses) VALUES (?, ?, 1)',
        args: [code, credits],
      });
      generated.push(code);
    }

    await client.batch(batchStatements, 'write');
    return generated;
  },

  async deleteCoupon(id) {
    await client.execute({ sql: 'DELETE FROM coupons WHERE id = ?', args: [id] });
    return { success: true };
  },
};

export const uploadQueries = {
  async createTempUpload({ id, user_id, file_path, original_name, mime_type }) {
    await client.execute({
      sql: `
        INSERT INTO temp_uploads (id, user_id, file_path, original_name, mime_type)
        VALUES (?, ?, ?, ?, ?)
      `,
      args: [id, user_id, file_path, original_name, mime_type],
    });
    const res = await client.execute({ sql: 'SELECT * FROM temp_uploads WHERE id = ?', args: [id] });
    return res.rows[0];
  },

  async getTempUpload(id) {
    const res = await client.execute({ sql: 'SELECT * FROM temp_uploads WHERE id = ?', args: [id] });
    return res.rows[0] || null;
  },

  async deleteTempUpload(id) {
    await client.execute({ sql: 'DELETE FROM temp_uploads WHERE id = ?', args: [id] });
    return { success: true };
  },
};

export default client;
