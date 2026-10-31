import { Router } from 'express';
import Subscription from '../models/Subscription.js';
import Invoice from '../models/Invoice.js';
import Payment from '../models/Payment.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { wrap, httpError } from '../utils/http.js';
import { invoiceHtml } from '../services/invoiceHtml.js';
import { getSummary } from '../services/reportService.js';
import * as svc from '../services/subscriptionService.js';

const router = Router();
router.use(requireAuth, requireRole('customer'));

// Every query below is scoped by the logged-in user's id from the token.
// Ids sent by the client are only used to pick ONE record among the customer's own.
const mine = req => ({ customer: req.user.id });
const paging = req => {
  const page = Math.max(+req.query.page || 1, 1);
  const limit = Math.min(+req.query.limit || 20, 50);
  return { page, limit, skip: (page - 1) * limit };
};

const ownSub = async req => {
  const sub = await Subscription.findOne({ _id: req.params.id, ...mine(req), status: { $ne: 'Draft' } });
  if (!sub) throw httpError(404, 'Subscription not found');   // 404, not 403: never reveal other ids exist
  return sub;
};
const ownInvoice = async req => {
  const inv = await Invoice.findOne({ _id: req.params.id, ...mine(req), status: { $ne: 'Draft' } });
  if (!inv) throw httpError(404, 'Invoice not found');
  return inv;
};

router.get('/summary', wrap(async (req, res) => {
  res.json(await getSummary({ customer: req.user.id }));
}));

// ---- subscriptions
router.get('/subscriptions', wrap(async (req, res) => {
  const { page, limit, skip } = paging(req);
  const filter = { ...mine(req), status: req.query.status || { $ne: 'Draft' } };
  const [items, total] = await Promise.all([
    Subscription.find(filter).select('-lines').populate('plan', 'name period')
      .sort('-createdAt').skip(skip).limit(limit).lean(),
    Subscription.countDocuments(filter),
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) });
}));

router.get('/subscriptions/:id', wrap(async (req, res) => {
  const sub = await ownSub(req);
  await sub.populate('plan', 'name period price pausable renewable closable');
  res.json(sub);
}));

// customers manage their own ACTIVE subscriptions; plan flags are still enforced by the service
const activeOnly = sub => {
  if (sub.status !== 'Active') throw httpError(400, 'Only active subscriptions can be changed here');
  return sub;
};
router.post('/subscriptions/:id/pause', wrap(async (req, res) => res.json(await svc.pause(activeOnly(await ownSub(req))))));
router.post('/subscriptions/:id/resume', wrap(async (req, res) => res.json(await svc.resume(activeOnly(await ownSub(req))))));
router.post('/subscriptions/:id/renew', wrap(async (req, res) => res.json(await svc.renew(activeOnly(await ownSub(req))))));
router.post('/subscriptions/:id/close', wrap(async (req, res) => res.json(await svc.transition(activeOnly(await ownSub(req)), 'Closed'))));

// ---- invoices (drafts are internal, never shown)
router.get('/invoices', wrap(async (req, res) => {
  const { page, limit, skip } = paging(req);
  const filter = { ...mine(req), status: req.query.status || { $ne: 'Draft' } };
  if (req.query.overdue === 'true') Object.assign(filter, { status: 'Confirmed', dueDate: { $lt: new Date() } });
  if (req.query.subscription) filter.subscription = req.query.subscription;

  const [items, total] = await Promise.all([
    Invoice.find(filter).select('-lines').sort('-createdAt').skip(skip).limit(limit).lean(),
    Invoice.countDocuments(filter),
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) });
}));

router.get('/invoices/:id', wrap(async (req, res) => res.json(await ownInvoice(req))));
router.get('/invoices/:id/print', wrap(async (req, res) =>
  res.type('html').send(invoiceHtml(await ownInvoice(req)))));

// ---- payment history
router.get('/payments', wrap(async (req, res) => {
  const { page, limit, skip } = paging(req);
  const [items, total] = await Promise.all([
    Payment.find(mine(req)).select('-recordedBy').sort('-date').skip(skip).limit(limit).lean(),
    Payment.countDocuments(mine(req)),
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) });
}));

export default router;