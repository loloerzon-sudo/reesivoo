import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { couponQueries, userQueries } from '../db/index.js';

const router = express.Router();

// 1. Redeem a coupon/voucher code
router.post('/redeem', requireAuth, (req, res) => {
  const { code } = req.body;
  if (!code || typeof code !== 'string' || !code.trim()) {
    return res.status(400).json({ error: 'Please enter a coupon code' });
  }

  try {
    const result = couponQueries.redeemCoupon(req.user.id, code);
    res.json({
      success: true,
      addedCredits: result.addedCredits,
      newTotalCredits: result.newTotalCredits,
      message: `Successfully redeemed ${result.addedCredits} scan credits!`,
    });
  } catch (err) {
    res.status(400).json({
      error: err.message || 'Failed to redeem coupon code',
    });
  }
});

// 2. Generate a coupon (Developer / Admin utility)
router.post('/create', requireAuth, (req, res) => {
  // Only erzon22@gmail.com can create coupons
  if (req.user.email !== 'erzon22@gmail.com') {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const { code, credits, max_uses } = req.body;
  if (!code || !credits) {
    return res.status(400).json({ error: 'Code and credits amount are required' });
  }

  try {
    const coupon = couponQueries.createCoupon({
      code,
      credits: parseInt(credits, 10),
      max_uses: max_uses ? parseInt(max_uses, 10) : 1,
    });
    res.json({ success: true, coupon });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to create coupon' });
  }
});

export default router;
