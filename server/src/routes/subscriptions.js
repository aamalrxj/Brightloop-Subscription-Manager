import { Router } from 'express';
import { z } from 'zod';
import Subscription from '../models/Subscription.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { wrap, httpError } from '../utils/http.js';
import * as svc from '../services/subscriptionService.js';

const id = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const line = z.object({ product: id, variant: id.optional(), qty: z.number().int().min(1) });

const createSchema = z.object({
  customer: id, plan: id.optional(), template: id.optional(),
  startDate: z.coerce.date(), expiryDate: z.coerce.date().optional(),
  paymentTermDays: z.number().int().min(0).default(0),
  lines: z.array(line).min(1).optional(),
});
const updateSchema = z.object({
  plan: id, startDate: z.coerce.date(), expiryDate: z.coerce.date(),
  paymentTermDays: z.number().int().min(0), lines: z.array(line).min(1),
}).partial();

const router = Router();
router.use(requireAuth, requireRole('admin', 'staff'));

const load = async id => {
  const sub = await Subscription.findById(id);
  if (!sub) throw httpError(404, 'Subscription not found');
  return sub;
};

router.get('/', wrap(async (req, res) => {
  const page = Math.max(+req.query.page || 1, 1);
  const limit = Math.min(+req.query.limit || 20, 50);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.customer) filter.customer = req.query.customer;
  if (req.query.q) filter.number = new RegExp(req.query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

  const [items, total] = await Promise.all([
    Subscription.find(filter).select('-lines')
      .populate('customer', 'name email').populate('plan', 'name period')
      .sort('-createdAt').skip((page - 1) * limit).limit(limit).lean(),
    Subscription.countDocuments(filter),
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) });
}));

router.get('/:id', wrap(async (req, res) => {
  const sub = await Subscription.findById(req.params.id)
    .populate('customer', 'name email').populate('plan').lean();
  if (!sub) throw httpError(404, 'Subscription not found');
  res.json(sub);
}));

router.post('/', wrap(async (req, res) => {
  res.status(201).json(await svc.createSubscription(createSchema.parse(req.body)));
}));

router.patch('/:id', wrap(async (req, res) => {
  res.json(await svc.updateDraft(await load(req.params.id), updateSchema.parse(req.body)));
}));

// lifecycle: send -> confirm -> activate -> close
const steps = { send: 'Quotation', confirm: 'Confirmed', activate: 'Active', close: 'Closed' };
for (const [path, to] of Object.entries(steps))
  router.post(`/:id/${path}`, wrap(async (req, res) =>
    res.json(await svc.transition(await load(req.params.id), to))));

router.post('/:id/pause', wrap(async (req, res) => res.json(await svc.pause(await load(req.params.id)))));
router.post('/:id/resume', wrap(async (req, res) => res.json(await svc.resume(await load(req.params.id)))));
router.post('/:id/renew', wrap(async (req, res) => res.json(await svc.renew(await load(req.params.id)))));

export default router;