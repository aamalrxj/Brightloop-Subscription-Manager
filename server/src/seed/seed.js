import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Tax from '../models/Tax.js';
import Product from '../models/Product.js';
import Plan from '../models/Plan.js';
import Subscription from '../models/Subscription.js';
import Invoice from '../models/Invoice.js';
import Payment, { METHODS } from '../models/Payment.js';
import { round2 } from '../services/pricing.js';
import { getSummary } from '../services/reportService.js';
import { addDays, addPeriod } from '../utils/dates.js';

const N_SUBS = +process.argv[2] || 2000;
const N_CUSTOMERS = 300;
const DAY = 864e5, now = new Date();
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const oid = () => new mongoose.Types.ObjectId();
const upsert = (Model, name, data) =>
  Model.findOneAndUpdate({ name }, { $setOnInsert: { name, ...data } }, { upsert: true, new: true });

await mongoose.connect(process.env.MONGO_URI);

// 1. remove data from any earlier seed run (re-running is safe)
const oldIds = await User.distinct('_id', { email: /^seed\d+@example\.com$/ });
await Promise.all([
  Subscription.deleteMany({ customer: { $in: oldIds } }),
  Invoice.deleteMany({ customer: { $in: oldIds } }),
  Payment.deleteMany({ customer: { $in: oldIds } }),
  User.deleteMany({ _id: { $in: oldIds } }),
]);

// 2. catalog
const gst18 = await upsert(Tax, 'GST 18%', { rate: 18 });
const gst5 = await upsert(Tax, 'GST 5%', { rate: 5 });
const taxById = new Map([gst18, gst5].map(t => [String(t._id), t]));

const products = await Promise.all([
  upsert(Product, 'CRM Suite', { type: 'software', salesPrice: 1200, costPrice: 700, tax: gst18._id,
    variants: [{ attribute: 'Brand', value: 'Odoo', extraPrice: 560 }, { attribute: 'Brand', value: 'Zoho', extraPrice: 300 }] }),
  upsert(Product, 'Helpdesk', { type: 'software', salesPrice: 800, costPrice: 450, tax: gst18._id,
    variants: [{ attribute: 'Tier', value: 'Pro', extraPrice: 250 }] }),
  upsert(Product, 'Analytics Add-on', { type: 'add-on', salesPrice: 400, costPrice: 200, tax: gst18._id }),
  upsert(Product, 'Cloud Backup', { type: 'add-on', salesPrice: 300, costPrice: 120, tax: gst5._id }),
  upsert(Product, 'Priority Support', { type: 'service', salesPrice: 600, costPrice: 300, tax: gst18._id,
    variants: [{ attribute: 'Support', value: 'Premium', extraPrice: 400 }] }),
]);

const flags = { autoClose: true, closable: true, pausable: true, renewable: true, minQty: 1,
  availableFrom: new Date('2025-01-01'), availableTo: new Date('2030-12-31') };
const monthly = await upsert(Plan, 'Business Monthly', { price: 1500, period: 'monthly', ...flags });
const yearly = await upsert(Plan, 'Business Yearly', { price: 15000, period: 'yearly', ...flags });

// 3. customers (all share the password Customer@123)
const hash = await bcrypt.hash('Customer@123', 10);
const customers = await User.insertMany(Array.from({ length: N_CUSTOMERS }, (_, i) => ({
  name: `Customer ${String(i + 1).padStart(3, '0')}`,
  email: `seed${String(i + 1).padStart(3, '0')}@example.com`, password: hash, role: 'customer',
})));

// 4. subscriptions, invoices, payments (built in memory, inserted in bulk)
const counters = mongoose.connection.collection('counters');
let subSeq = (await counters.findOne({ _id: 'subscription' }))?.seq ?? 0;
let invSeq = (await counters.findOne({ _id: 'invoice' }))?.seq ?? 0;
const subs = [], invoices = [], payments = [];

for (let i = 0; i < N_SUBS; i++) {
  const plan = Math.random() < 0.8 ? monthly : yearly;
  const r = Math.random();
  const status = r < 0.70 ? 'Active' : r < 0.80 ? 'Closed' : r < 0.87 ? 'Draft' : r < 0.94 ? 'Quotation' : 'Confirmed';
  const billed = status === 'Active' || status === 'Closed';

  const startDate = billed
    ? addDays(now, -((plan === yearly ? rnd(1, 14) : rnd(1, 10)) * 30 + rnd(0, 25)))
    : addDays(now, rnd(0, 30));
  const term = pick([0, 15, 30]);
  const customer = pick(customers);

  const lines = [...products].sort(() => Math.random() - 0.5).slice(0, rnd(1, 3)).map(p => {
    const v = p.variants.length && Math.random() < 0.5 ? pick(p.variants) : null;
    const qty = rnd(1, 10), unitPrice = round2(p.salesPrice + (v?.extraPrice ?? 0));
    const amount = round2(unitPrice * qty), t = taxById.get(String(p.tax));
    return { product: p._id, variant: v?._id, name: p.name, variantLabel: v && `${v.attribute}: ${v.value}`,
      qty, unitPrice, taxName: t.name, taxRate: t.rate, amount, taxAmount: round2(amount * t.rate / 100) };
  });
  const subtotal = round2(lines.reduce((s, l) => s + l.amount, 0));
  const taxTotal = round2(lines.reduce((s, l) => s + l.taxAmount, 0));
  const total = round2(subtotal + taxTotal);

  const sub = {
    _id: oid(), number: `SUB-${String(++subSeq).padStart(4, '0')}`, customer: customer._id, plan: plan._id,
    status, startDate, expiryDate: addDays(startDate, 730), paymentTermDays: term, validityDays: 30,
    lines, subtotal, taxTotal, total, createdAt: startDate,
  };

  if (billed) {
    const cutoff = status === 'Closed' ? addDays(startDate, rnd(30, Math.max(31, Math.floor((now - startDate) / DAY)))) : now;
    let ps = startDate;
    while (ps <= cutoff) {
      const pe = addPeriod(ps, plan.period);
      const old = (now - ps) / DAY > 30, x = Math.random();
      const kind = old ? (x < 0.8 ? 'paid' : x < 0.9 ? 'partial' : 'open')
                       : (x < 0.4 ? 'paid' : x < 0.5 ? 'partial' : 'open');
      const invId = oid(), number = `INV-${String(++invSeq).padStart(4, '0')}`;
      const payDate = () => { const d = addDays(ps, rnd(0, 25)); return d > now ? now : d; };

      const pays = [];
      if (kind === 'paid' && Math.random() < 0.15) {
        const first = round2(total * 0.5), d1 = payDate();
        pays.push({ amount: first, date: d1 }, { amount: round2(total - first), date: new Date(Math.min(+addDays(d1, rnd(1, 10)), +now)) });
      } else if (kind === 'paid') pays.push({ amount: total, date: payDate() });
      else if (kind === 'partial') pays.push({ amount: round2(total * (0.3 + Math.random() * 0.4)), date: payDate() });

      const amountPaid = round2(pays.reduce((s, p) => s + p.amount, 0));
      invoices.push({
        _id: invId, number, subscription: sub._id, subscriptionNumber: sub.number,
        customer: customer._id, customerName: customer.name, customerEmail: customer.email,
        periodStart: ps, periodEnd: pe, invoiceDate: ps, dueDate: addDays(ps, term),
        status: kind === 'paid' ? 'Paid' : 'Confirmed', confirmedAt: ps,
        paidAt: kind === 'paid' ? pays[pays.length - 1].date : undefined,
        lines: lines.map(l => ({ product: l.product, name: l.name, variantLabel: l.variantLabel, qty: l.qty,
          unitPrice: l.unitPrice, amount: l.amount, discountAmount: 0, taxName: l.taxName, taxRate: l.taxRate,
          taxAmount: l.taxAmount, total: round2(l.amount + l.taxAmount) })),
        subtotal, discountTotal: 0, taxTotal, total, amountPaid, createdAt: ps,
      });
      pays.forEach(p => payments.push({ invoice: invId, invoiceNumber: number, customer: customer._id,
        method: pick(METHODS), amount: p.amount, date: p.date, note: 'Seed data', createdAt: p.date }));
      ps = pe;
    }
    if (status === 'Active') sub.nextBillingDate = ps;
    else sub.closedAt = cutoff;
  } else if (status !== 'Draft') {
    sub.quotationExpiry = addDays(now, 30);
  }
  subs.push(sub);
}

const insertAll = async (Model, docs) => {
  for (let i = 0; i < docs.length; i += 1000) await Model.insertMany(docs.slice(i, i + 1000), { ordered: false });
};
await insertAll(Subscription, subs);
await insertAll(Invoice, invoices);
await insertAll(Payment, payments);

// keep numbering in step so new subscriptions and invoices don't collide with seeded ones
await counters.updateOne({ _id: 'subscription' }, { $set: { seq: subSeq } }, { upsert: true });
await counters.updateOne({ _id: 'invoice' }, { $set: { seq: invSeq } }, { upsert: true });

console.log(`Seeded ${customers.length} customers, ${subs.length} subscriptions, ${invoices.length} invoices, ${payments.length} payments`);

// 5. prove the 2-second requirement
await Promise.all([Subscription.init(), Invoice.init(), Payment.init()]);   // make sure indexes are built
const time = async (label, fn) => { const s = Date.now(); await fn(); console.log(`${label}: ${Date.now() - s} ms`); };
await time('dashboard summary', () => getSummary({}));
await time('subscriptions page', () => Subscription.find().select('-lines').populate('customer', 'name email')
  .populate('plan', 'name period').sort('-createdAt').limit(20).lean());
await time('overdue invoices page', () => Invoice.find({ status: 'Confirmed', dueDate: { $lt: now } })
  .select('-lines').sort('-createdAt').limit(20).lean());

process.exit();