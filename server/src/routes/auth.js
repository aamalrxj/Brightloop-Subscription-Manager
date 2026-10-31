
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { z } from 'zod';
import User from '../models/User.js';
import { passwordRule } from '../utils/password.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
const wrap = fn => (req, res, next) =>
  fn(req, res, next).catch(next);

const pwd = z.string().regex(
  passwordRule,
  'Password must be 9+ chars with uppercase, lowercase and a special character'
);

const sign = (res, user) => {
  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );

  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 864e5,
  });
};

router.post('/signup', wrap(async (req, res) => {
  const { name, email, password } = z.object({
    name: z.string().min(1),
    email: z.string().email(),
    password: pwd,
  }).parse(req.body);

  const user = await User.create({
    name,
    email,
    password: await bcrypt.hash(password, 10),
  });

  sign(res, user);

  res.status(201).json({
    id: user._id,
    name,
    email,
    role: user.role,
  });
}));

router.post('/login', wrap(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({
      message: 'Invalid email or password',
    });
  }

  if (user.active === false) {
    return res.status(403).json({
      message: 'This account has been deactivated. Contact your administrator.',
    });
  }

  sign(res, user);

  res.json({
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
  });
}));

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ ok: true });
});

router.get('/me', requireAuth, wrap(async (req, res) => {
  res.json(await User.findById(req.user.id).lean());
}));

// Admin only: list staff accounts
router.get('/staff', requireAuth, requireRole('admin'), wrap(async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Number(req.query.limit) || 20, 50);

  const filter = { role: 'staff' };

  if (req.query.q) {
    const regex = new RegExp(
      req.query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
      'i'
    );

    filter.$or = [
      { name: regex },
      { email: regex },
    ];
  }

  if (req.query.active === 'true') filter.active = true;
  if (req.query.active === 'false') filter.active = false;

  const [items, total] = await Promise.all([
    User.find(filter)
      .select('name email role active createdAt')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),

    User.countDocuments(filter),
  ]);

  res.json({
    items,
    total,
    page,
    pages: Math.ceil(total / limit),
  });
}));

// Admin only: create staff account
router.post('/staff', requireAuth, requireRole('admin'), wrap(async (req, res) => {
  const { name, email, password } = z.object({
    name: z.string().min(1),
    email: z.string().email(),
    password: pwd,
  }).parse(req.body);

  const user = await User.create({
    name,
    email,
    role: 'staff',
    password: await bcrypt.hash(password, 10),
  });

  res.status(201).json({
    id: user._id,
    name,
    email,
    role: 'staff',
    active: user.active,
  });
}));

// Admin only: activate or deactivate a staff account
router.patch('/staff/:id', requireAuth, requireRole('admin'), wrap(async (req, res) => {
  const { active } = z.object({
    active: z.boolean(),
  }).parse(req.body);

  if (!/^[a-f\d]{24}$/i.test(req.params.id)) {
    return res.status(400).json({
      message: 'Invalid staff ID',
    });
  }

  const user = await User.findOneAndUpdate(
    {
      _id: req.params.id,
      role: 'staff',
    },
    { $set: { active } },
    {
      new: true,
      runValidators: true,
    }
  ).select('name email role active');

  if (!user) {
    return res.status(404).json({
      message: 'Staff account not found',
    });
  }

  res.json({
    message: active
      ? 'Staff account activated successfully'
      : 'Staff account deactivated successfully',
    staff: user,
  });
}));

// Forgot password: reset link is currently logged to console
router.post('/forgot', wrap(async (req, res) => {
  const user = await User.findOne({ email: req.body.email });

  if (user) {
    const raw = crypto.randomBytes(32).toString('hex');

    user.resetTokenHash = crypto
      .createHash('sha256')
      .update(raw)
      .digest('hex');

    user.resetTokenExpiry = Date.now() + 15 * 60 * 1000;

    await user.save();

    console.log(
      `RESET LINK: ${process.env.CLIENT_URL}/reset/${raw}`
    );
  }

  res.json({
    message: 'If that email exists, a reset link has been sent',
  });
}));

router.post('/reset/:token', wrap(async (req, res) => {
  const { password } = z.object({
    password: pwd,
  }).parse(req.body);

  const hash = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    resetTokenHash: hash,
    resetTokenExpiry: { $gt: Date.now() },
  });

  if (!user) {
    return res.status(400).json({
      message: 'Link invalid or expired',
    });
  }

  user.password = await bcrypt.hash(password, 10);
  user.resetTokenHash = undefined;
  user.resetTokenExpiry = undefined;

  await user.save();

  res.json({ message: 'Password updated' });
}));

export default router;
