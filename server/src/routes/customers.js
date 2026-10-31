import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import User from '../models/User.js';
import { passwordRule } from '../utils/password.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { wrap } from '../utils/http.js';

const router = Router();
router.use(requireAuth, requireRole('admin', 'staff'));

router.get('/', wrap(async (req, res) => {
  const page = Math.max(+req.query.page || 1, 1);
  const limit = Math.min(+req.query.limit || 20, 50);
  const filter = { role: 'customer' };
  if (req.query.q) {
    const re = new RegExp(req.query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: re }, { email: re }];
  }
  const [items, total] = await Promise.all([
    User.find(filter).select('name email createdAt').sort('-createdAt')
      .skip((page - 1) * limit).limit(limit).lean(),
    User.countDocuments(filter),
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) });
}));

router.post('/', wrap(async (req, res) => {
  const { name, email, password } = z.object({
    name: z.string().min(1), email: z.string().email(),
    password: z.string().regex(passwordRule, 'Password must be 9+ chars with uppercase, lowercase and a special character'),
  }).parse(req.body);
  const u = await User.create({ name, email, password: await bcrypt.hash(password, 10) });
  res.status(201).json({ id: u._id, name, email });
}));

export default router;