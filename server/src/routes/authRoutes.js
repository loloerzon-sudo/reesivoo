import express from 'express';
import { getAuthorizationUrl, exchangeCodeForTokens, getAuthenticatedClient } from '../config/google.js';
import { userQueries } from '../db/index.js';
import { getOrCreateReceiptsFolder } from '../services/driveService.js';
import { getOrCreateReceiptTrackerSheet } from '../services/sheetsService.js';

const router = express.Router();

// 1. Get Google OAuth login URL
router.get('/url', (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID.trim() === '') {
    return res.status(400).json({
      error: 'GOOGLE_CLIENT_ID is missing in server/.env. Please paste your Google OAuth Client ID into server/.env.',
    });
  }

  try {
    const url = getAuthorizationUrl();
    res.json({ url });
  } catch (err) {
    console.error('Error generating Google auth URL:', err);
    res.status(500).json({ error: err.message || 'Failed to generate Google authorization URL' });
  }
});

// 2a. Direct GET redirect from Google
router.get('/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}?error=no_code`);
  }

  try {
    const { tokens, profile } = await exchangeCodeForTokens(code);

    let user = userQueries.upsertUser({
      google_id: profile.id,
      email: profile.email,
      name: profile.name,
      avatar_url: profile.picture,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expiry: tokens.expiry_date,
    });

    const authClient = getAuthenticatedClient(user);

    let folderId = user.target_folder_id;
    if (!folderId) {
      try {
        folderId = await getOrCreateReceiptsFolder(authClient);
      } catch (fErr) {
        console.warn('Drive folder auto-provisioning deferred:', fErr.message);
      }
    }

    let sheetId = user.target_sheet_id;
    if (!sheetId) {
      try {
        sheetId = await getOrCreateReceiptTrackerSheet(authClient, folderId);
      } catch (sErr) {
        console.warn('Google Sheet auto-provisioning deferred:', sErr.message);
      }
    }

    if (folderId !== user.target_folder_id || sheetId !== user.target_sheet_id) {
      user = userQueries.updateUserTargets(user.id, {
        target_folder_id: folderId,
        target_sheet_id: sheetId,
      });
    }

    req.session.userId = user.id;
    res.redirect(process.env.CLIENT_URL || 'http://localhost:5173');
  } catch (err) {
    console.error('OAuth GET callback error:', err);
    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}?error=${encodeURIComponent(err.message)}`);
  }
});

// 2b. POST authorization code exchange from frontend
router.post('/callback', async (req, res) => {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ error: 'Authorization code is required' });
  }

  try {
    const { tokens, profile } = await exchangeCodeForTokens(code);

    let user = userQueries.upsertUser({
      google_id: profile.id,
      email: profile.email,
      name: profile.name,
      avatar_url: profile.picture,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expiry: tokens.expiry_date,
    });

    const authClient = getAuthenticatedClient(user);

    // Auto-provision Drive folder if not yet configured
    let folderId = user.target_folder_id;
    if (!folderId) {
      try {
        folderId = await getOrCreateReceiptsFolder(authClient);
      } catch (fErr) {
        console.warn('Drive folder auto-provisioning deferred:', fErr.message);
      }
    }

    // Auto-provision Google Sheet if not yet configured
    let sheetId = user.target_sheet_id;
    if (!sheetId) {
      try {
        sheetId = await getOrCreateReceiptTrackerSheet(authClient, folderId);
      } catch (sErr) {
        console.warn('Google Sheet auto-provisioning deferred:', sErr.message);
      }
    }

    if (folderId !== user.target_folder_id || sheetId !== user.target_sheet_id) {
      user = userQueries.updateUserTargets(user.id, {
        target_folder_id: folderId,
        target_sheet_id: sheetId,
      });
    }

    // Set session cookie
    req.session.userId = user.id;

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatar_url,
        targetSheetId: user.target_sheet_id,
        targetFolderId: user.target_folder_id,
        sheetUrl: user.target_sheet_id ? `https://docs.google.com/spreadsheets/d/${user.target_sheet_id}/edit` : null,
        folderUrl: user.target_folder_id ? `https://drive.google.com/drive/folders/${user.target_folder_id}` : null,
      },
    });
  } catch (err) {
    console.error('OAuth callback error:', err);
    res.status(500).json({ error: err.message || 'Failed to complete Google authentication' });
  }
});

// 3. Current authenticated user status
router.get('/me', (req, res) => {
  const userId = req.session?.userId;
  if (!userId) {
    return res.json({ authenticated: false, user: null });
  }

  const user = userQueries.getUserById(userId);
  if (!user) {
    req.session = null;
    return res.json({ authenticated: false, user: null });
  }

  res.json({
    authenticated: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatar_url,
      targetSheetId: user.target_sheet_id,
      targetFolderId: user.target_folder_id,
      sheetUrl: user.target_sheet_id ? `https://docs.google.com/spreadsheets/d/${user.target_sheet_id}/edit` : null,
      folderUrl: user.target_folder_id ? `https://drive.google.com/drive/folders/${user.target_folder_id}` : null,
    },
  });
});

// 4. Logout
router.post('/logout', (req, res) => {
  req.session = null;
  res.json({ success: true });
});

export default router;
