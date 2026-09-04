import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { couponQueries, userQueries } from '../db/index.js';

const router = express.Router();

// Admin security guard: Only erzon22@gmail.com is authorized
function requireAdmin(req, res, next) {
  if (req.user?.email !== 'erzon22@gmail.com') {
    return res.status(403).json({ error: 'Access denied: Admin only' });
  }
  next();
}

router.use(requireAuth);
router.use(requireAdmin);

// 1. Get all coupons with redemption details
router.get('/coupons', async (req, res) => {
  try {
    const coupons = await couponQueries.getAllCouponsWithDetails();
    res.json({ success: true, coupons });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch coupons' });
  }
});

// 2. Batch generate single-use GCash vouchers
router.post('/coupons/batch', async (req, res) => {
  const { prefix = 'GCASH', credits = 100, count = 5 } = req.body;
  const numCredits = parseInt(credits, 10);
  const numCount = Math.min(Math.max(parseInt(count, 10) || 1, 1), 50);

  try {
    const generatedCodes = await couponQueries.createBatchCoupons({
      prefix: (prefix || 'GCASH').toUpperCase(),
      credits: numCredits,
      count: numCount,
    });
    res.json({
      success: true,
      message: `Generated ${generatedCodes.length} vouchers for ${numCredits} scans each!`,
      codes: generatedCodes,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to generate batch coupons' });
  }
});

// 3. Create custom promo coupon
router.post('/coupons/create', async (req, res) => {
  const { code, credits, max_uses = 1 } = req.body;
  if (!code || !credits) {
    return res.status(400).json({ error: 'Code and credits are required' });
  }

  try {
    const coupon = await couponQueries.createCoupon({
      code,
      credits: parseInt(credits, 10),
      max_uses: parseInt(max_uses, 10),
    });
    res.json({ success: true, coupon });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to create coupon' });
  }
});

// 4. Delete/deactivate coupon
router.delete('/coupons/:id', async (req, res) => {
  try {
    await couponQueries.deleteCoupon(parseInt(req.params.id, 10));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to delete coupon' });
  }
});

// 5. Get all users and credit balances
router.get('/users', async (req, res) => {
  try {
    const users = await userQueries.getAllUsers();
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch users' });
  }
});

// 6. Manually adjust user credits
router.post('/users/:id/credits', async (req, res) => {
  const { credits } = req.body;
  if (typeof credits !== 'number') {
    return res.status(400).json({ error: 'Credits must be a number' });
  }

  try {
    const updated = await userQueries.setUserCredits(parseInt(req.params.id, 10), credits);
    res.json({ success: true, user: updated });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to update user credits' });
  }
});

export default router;
