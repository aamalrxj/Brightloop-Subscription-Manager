
import { Router } from 'express';
import Invoice from '../models/Invoice.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { wrap, httpError } from '../utils/http.js';
import * as svc from '../services/invoiceService.js';
import { invoiceHtml } from '../services/invoiceHtml.js';

const router = Router();

router.use(requireAuth, requireRole('admin', 'staff'));

const load = async id => {
  const inv = await Invoice.findById(id);

  if (!inv) {
    throw httpError(404, 'Invoice not found');
  }

  return inv;
};

router.get('/', wrap(async (req, res) => {
  const page = Math.max(+req.query.page || 1, 1);
  const limit = Math.min(+req.query.limit || 20, 50);

  const {
    status,
    customer,
    subscription,
    overdue,
    partial,
    from,
    to,
    q,
  } = req.query;

  const filter = {};
  const now = new Date();

  // Customer and subscription filters
  if (customer) filter.customer = customer;
  if (subscription) filter.subscription = subscription;

  // Invoice state filters
  if (overdue === 'true') {
    // Confirmed invoices past their due date.
    // Includes partially paid invoices that are overdue.
    filter.status = 'Confirmed';
    filter.dueDate = { $lt: now };

  } else if (partial === 'true') {
    // Partially paid invoices that are not yet overdue.
    filter.status = 'Confirmed';
    filter.amountPaid = { $gt: 0 };
    filter.dueDate = { $gte: now };
    filter.$expr = {
      $lt: ['$amountPaid', '$total'],
    };

  } else if (status === 'Confirmed') {
    // Confirmed invoices with no payments and not overdue.
    filter.status = 'Confirmed';
    filter.amountPaid = 0;
    filter.dueDate = { $gte: now };

  } else if (status) {
    filter.status = status;
  }

  // Invoice date range
  if (from || to) {
    filter.invoiceDate = {
      ...(from && { $gte: new Date(from) }),
      ...(to && { $lte: new Date(to) }),
    };
  }

  // Search by invoice number
  if (q) {
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.number = new RegExp(escaped, 'i');
  }

  const [items, total] = await Promise.all([
    Invoice.find(filter)
      .select('-lines')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),

    Invoice.countDocuments(filter),
  ]);

  res.json({
    items,
    total,
    page,
    pages: Math.ceil(total / limit),
  });
}));

router.get('/:id', wrap(async (req, res) => {
  res.json(await load(req.params.id));
}));

router.get('/:id/print', wrap(async (req, res) => {
  res.type('html').send(invoiceHtml(await load(req.params.id)));
}));

router.post('/:id/confirm', wrap(async (req, res) => {
  res.json(await svc.confirm(await load(req.params.id)));
}));

router.post('/:id/cancel', wrap(async (req, res) => {
  res.json(await svc.cancel(await load(req.params.id)));
}));

router.post('/:id/send', wrap(async (req, res) => {
  res.json(await svc.send(await load(req.params.id)));
}));

export default router;
