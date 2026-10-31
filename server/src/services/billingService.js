import Subscription from '../models/Subscription.js';
import Invoice from '../models/Invoice.js';
import Plan from '../models/Plan.js';
import { loadDiscounts, rank, reserve, release } from './discounts.js';
import { round2 } from './pricing.js';
import { nextNumber } from '../utils/numbering.js';
import { addDays, addPeriod } from '../utils/dates.js';

const MAX_CATCHUP = 60;   // periods per subscription per run; the rest is picked up next run
const BATCH = 20;         // subscriptions processed in parallel

async function createInvoice(sub, periodStart, periodEnd, ctx) {
  // cheap pre-check so re-runs do not burn invoice numbers; the unique index is the real guard
  if (await Invoice.exists({ subscription: sub._id, periodStart })) return false;

  let pick = null;
  for (const c of rank(ctx.discounts, sub.lines)) {          // one best discount per invoice
    if (await reserve(c.discount)) { pick = c; break; }
  }

  const lines = sub.lines.map((l, i) => {
    const discountAmount = pick?.alloc[i] ?? 0;
    const taxable = round2(l.amount - discountAmount);
    const taxAmount = round2((taxable * l.taxRate) / 100);
    return {
      product: l.product, name: l.name, variantLabel: l.variantLabel,
      qty: l.qty, unitPrice: l.unitPrice, amount: l.amount, discountAmount,
      taxName: l.taxName, taxRate: l.taxRate, taxAmount, total: round2(taxable + taxAmount),
    };
  });
  const subtotal = round2(lines.reduce((s, l) => s + l.amount, 0));
  const discountTotal = round2(lines.reduce((s, l) => s + l.discountAmount, 0));
  const taxTotal = round2(lines.reduce((s, l) => s + l.taxAmount, 0));

  try {
    await Invoice.create({
      number: await nextNumber('invoice', 'INV'),
      subscription: sub._id, subscriptionNumber: sub.number,
      customer: sub.customer._id, customerName: sub.customer.name, customerEmail: sub.customer.email,
      periodStart, periodEnd, invoiceDate: ctx.asOf, dueDate: addDays(ctx.asOf, sub.paymentTermDays),
      status: ctx.autoConfirm ? 'Confirmed' : 'Draft',
      confirmedAt: ctx.autoConfirm ? ctx.asOf : undefined,
      lines, discountId: pick?.discount._id, discountName: pick?.discount.name,
      subtotal, discountTotal, taxTotal, total: round2(subtotal - discountTotal + taxTotal),
    });
    return true;
  } catch (e) {
    if (pick) await release(pick.discount._id);               // give the discount use back
    if (e.code === 11000) return false;                       // already billed for this period
    throw e;
  }
}

async function billSubscription(sub, ctx) {
  let created = 0, skipped = 0, guard = 0;
  while (sub.nextBillingDate <= ctx.asOf && sub.nextBillingDate <= sub.expiryDate && guard++ < MAX_CATCHUP) {
    const periodStart = sub.nextBillingDate;
    const periodEnd = addPeriod(periodStart, sub.plan.period);

    (await createInvoice(sub, periodStart, periodEnd, ctx)) ? created++ : skipped++;

    // advance only if nobody else already did (safe if two runs overlap)
    const moved = await Subscription.updateOne(
      { _id: sub._id, nextBillingDate: periodStart }, { nextBillingDate: periodEnd });
    if (!moved.modifiedCount) break;
    sub.nextBillingDate = periodEnd;
  }
  return { created, skipped };
}

// plans with autoClose shut their subscriptions when the expiry date has passed
export async function closeExpired(asOf) {
  const planIds = await Plan.distinct('_id', { autoClose: true });
  const r = await Subscription.updateMany(
    { status: 'Active', expiryDate: { $lt: asOf }, plan: { $in: planIds } },
    { status: 'Closed', closedAt: asOf, paused: false });
  return r.modifiedCount;
}

export async function runBilling({ asOf = new Date(), autoConfirm = false, subscription } = {}) {
  const summary = { asOf, created: 0, skipped: 0, failed: 0, closed: 0, errors: [] };
  const ctx = { asOf, autoConfirm, discounts: await loadDiscounts(asOf) };

  const filter = { status: 'Active', paused: false, nextBillingDate: { $lte: asOf } };
  if (subscription) filter._id = subscription;

  const run = async sub => {
    try {
      const r = await billSubscription(sub, ctx);
      summary.created += r.created; summary.skipped += r.skipped;
    } catch (e) {                                              // one failure never stops the batch
      summary.failed++;
      if (summary.errors.length < 20) summary.errors.push({ subscription: sub.number, message: e.message });
    }
  };

  let batch = [];
  const cursor = Subscription.find(filter).populate('plan', 'period').populate('customer', 'name email').cursor();
  for await (const sub of cursor) {
    batch.push(sub);
    if (batch.length === BATCH) { await Promise.all(batch.map(run)); batch = []; }
  }
  await Promise.all(batch.map(run));

  summary.closed = await closeExpired(asOf);                   // after billing, so no period is lost
  return summary;
}