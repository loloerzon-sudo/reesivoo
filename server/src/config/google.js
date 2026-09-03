import { google } from 'googleapis';
import dotenv from 'dotenv';
import { userQueries } from '../db/index.js';

dotenv.config();

export const OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/spreadsheets'
];

export function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/auth/callback'
  );
}

export function getAuthorizationUrl() {
  const oauth2Client = createOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: OAUTH_SCOPES
  });
}

export async function exchangeCodeForTokens(code) {
  const oauth2Client = createOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  // Fetch basic user profile
  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const { data: profile } = await oauth2.userinfo.get();

  return { tokens, profile };
}

export function getAuthenticatedClient(user) {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({
    access_token: user.access_token,
    refresh_token: user.refresh_token,
    expiry_date: user.token_expiry
  });

  // Automatically persist refreshed tokens to SQLite if Google triggers token refresh
  oauth2Client.on('tokens', (tokens) => {
    userQueries.updateUserTokens(user.id, {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || user.refresh_token,
      token_expiry: tokens.expiry_date
    });
  });

  return oauth2Client;
}
