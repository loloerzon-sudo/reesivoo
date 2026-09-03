import { userQueries } from '../db/index.js';
import { getAuthenticatedClient } from '../config/google.js';

export function requireAuth(req, res, next) {
  const userId = req.session?.userId;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized: No active session' });
  }

  const user = userQueries.getUserById(userId);
  if (!user) {
    req.session = null;
    return res.status(401).json({ error: 'Unauthorized: User not found' });
  }

  req.user = user;
  try {
    req.googleAuthClient = getAuthenticatedClient(user);
  } catch (err) {
    console.warn('Could not initialize Google client for user:', err.message);
  }
  next();
}
