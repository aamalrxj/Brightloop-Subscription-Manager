
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { z } from 'zod';
import User from '../models/User.js';
import { passwordRule } from '../utils/password.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { wrap, httpError } from '../utils/http.js';

const router = Router();

router.use(requireAuth, requireRole('admin', 'staff'));

// List and search customers
router.get('/', wrap(async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Number(req.query.limit) || 20, 50);

  const filter = { role: 'customer' };

  if (req.query.q) {
    const re = new RegExp(
      req.query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
      'i'
    );

    filter.$or = [{ name: re }, { email: re }];
  }

  if (req.query.active === 'true') filter.active = true;
  if (req.query.active === 'false') filter.active = false;

  const [items, total] = await Promise.all([
    User.find(filter)
      .select('name email active createdAt')
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

// Create a customer
router.post('/', wrap(async (req, res) => {
  const { name, email, password } = z.object({
    name: z.string().trim().min(1),
    email: z.string().email(),
    password: z.string().regex(
      passwordRule,
      'Password must be 9+ chars with uppercase, lowercase and a special character'
    ),
  }).parse(req.body);

  const user = await User.create({
    name,
    email: email.toLowerCase(),
    password: await bcrypt.hash(password, 10),
    role: 'customer',
    active: true,
  });

  res.status(201).json({
    id: user._id,
    name: user.name,
    email: user.email,
    active: user.active,
  });
}));

// Edit customer details or activate/deactivate a customer.
// Only admins can perform these changes.
router.patch('/:id', requireRole('admin'), wrap(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    throw httpError(400, 'Invalid customer ID');
  }

  const changes = z.object({
    name: z.string().trim().min(1).optional(),
    email: z.string().email().optional(),
    active: z.boolean().optional(),
  }).refine(
    data => Object.keys(data).length > 0,
    'Provide at least one field to update'
  ).parse(req.body);

  const customer = await User.findOne({
    _id: req.params.id,
    role: 'customer',
  });

  if (!customer) {
    throw httpError(404, 'Customer not found');
  }

  if (changes.email) {
    const email = changes.email.toLowerCase();

    const existing = await User.findOne({
      email,
      _id: { $ne: customer._id },
    });

    if (existing) {
      throw httpError(409, 'This email address is already in use');
    }

    customer.email = email;
  }

  if (changes.name !== undefined) {
    customer.name = changes.name;
  }

  if (changes.active !== undefined) {
    customer.active = changes.active;
  }

  await customer.save();

  res.json({
    id: customer._id,
    name: customer.name,
    email: customer.email,
    active: customer.active,
    message: 'Customer updated successfully',
  });
}));

export default router;
