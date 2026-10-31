import { Router } from 'express';
import { z } from 'zod';
import Payment, { METHODS } from '../models/Payment.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { wrap } from '../utils/http.js';
import { recordPayment } from '../services/paymentService.js';

const router = Router();
router.use(requireAuth, requireRole('admin', 'staff'));

const schema = z.object({
  invoice: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid invoice id'),
  method: z.enum(METHODS),
  amount: z.number().positive(),
  date: z.coerce.date().default(() => new Date())
    .refine(d => d <= new Date(Date.now() + 864e5), 'Payment date cannot be in the future'),
  note: z.string().max(500).optional(),
});

router.post('/', wrap(async (req, res) => {
  res.status(201).json(await recordPayment(schema.parse(req.body), req.user.id));
}));

router.get('/', wrap(async (req, res) => {
  const page = Math.max(+req.query.page || 1, 1);
  const limit = Math.min(+req.query.limit || 20, 50);
  const { invoice, customer, method, from, to } = req.query;

  const filter = {};
  if (invoice) filter.invoice = invoice;
  if (customer) filter.customer = customer;
  if (method) filter.method = method;
  if (from || to) filter.date = { ...(from && { $gte: new Date(from) }), ...(to && { $lte: new Date(to) }) };

  const [items, total] = await Promise.all([
    Payment.find(filter).populate('customer', 'name email').sort('-date')
      .skip((page - 1) * limit).limit(limit).lean(),
    Payment.countDocuments(filter),
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) });
}));

export default router;