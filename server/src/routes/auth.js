import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { z } from 'zod';
import User from '../models/User.js';
import { passwordRule } from '../utils/password.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
const wrap = fn => (req, res, next) => fn(req, res, next).catch(next);

const pwd = z.string().regex(passwordRule,
  'Password must be 9+ chars with uppercase, lowercase and a special character');

const sign = (res, user) => {
  const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
  res.cookie('token', token, { httpOnly: true, sameSite: 'lax', maxAge: 864e5 });
};

router.post('/signup', wrap(async (req, res) => {
  const { name, email, password } = z.object({
    name: z.string().min(1), email: z.string().email(), password: pwd,
  }).parse(req.body);
  const user = await User.create({ name, email, password: await bcrypt.hash(password, 10) });
  sign(res, user);
  res.status(201).json({ id: user._id, name, email, role: user.role });
}));

router.post('/login', wrap(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await bcrypt.compare(password, user.password)))
    return res.status(401).json({ message: 'Invalid email or password' });
  sign(res, user);
  res.json({ id: user._id, name: user.name, email: user.email, role: user.role });
}));

router.post('/logout', (req, res) => { res.clearCookie('token'); res.json({ ok: true }); });

router.get('/me', requireAuth, wrap(async (req, res) => {
  res.json(await User.findById(req.user.id).lean());
}));

// admin only: create staff
router.post('/staff', requireAuth, requireRole('admin'), wrap(async (req, res) => {
  const { name, email, password } = z.object({
    name: z.string().min(1), email: z.string().email(), password: pwd,
  }).parse(req.body);
  const user = await User.create({ name, email, role: 'staff', password: await bcrypt.hash(password, 10) });
  res.status(201).json({ id: user._id, name, email, role: 'staff' });
}));

// forgot password: link is logged to console
router.post('/forgot', wrap(async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (user) {
    const raw = crypto.randomBytes(32).toString('hex');
    user.resetTokenHash = crypto.createHash('sha256').update(raw).digest('hex');
    user.resetTokenExpiry = Date.now() + 15 * 60 * 1000;
    await user.save();
    console.log(`RESET LINK: ${process.env.CLIENT_URL}/reset/${raw}`);
  }
  res.json({ message: 'If that email exists, a reset link has been sent' });
}));

router.post('/reset/:token', wrap(async (req, res) => {
  const { password } = z.object({ password: pwd }).parse(req.body);
  const hash = crypto.createHash('sha256').update(req.params.token).digest('hex');
  const user = await User.findOne({ resetTokenHash: hash, resetTokenExpiry: { $gt: Date.now() } });
  if (!user) return res.status(400).json({ message: 'Link invalid or expired' });
  user.password = await bcrypt.hash(password, 10);
  user.resetTokenHash = user.resetTokenExpiry = undefined;
  await user.save();
  res.json({ message: 'Password updated' });
}));

export default router;