
import Subscription from '../models/Subscription.js';
import Invoice from '../models/Invoice.js';
import Plan from '../models/Plan.js';
import { loadDiscounts, rank, reserve, release } from './discounts.js';
import { round2 } from './pricing.js';
import { nextNumber } from '../utils/numbering.js';
import { addDays, addPeriod } from '../utils/dates.js';

const MAX_CATCHUP = 60;
const BATCH = 20;

async function createInvoice(sub, periodStart, periodEnd, ctx) {
  // Avoid creating duplicate invoices for the same subscription period.
  if (await Invoice.exists({ subscription: sub._id, periodStart })) {
    return false;
  }

  // New package subscriptions use one package-price line.
  // Older subscriptions without packagePrice retain their original line-based billing.
  const isPackageSubscription = sub.packagePrice != null;

  const discountLines = isPackageSubscription
    ? [{
        product: null,
        qty: Math.max(
          1,
          (sub.lines || []).reduce((sum, line) => sum + line.qty, 0)
        ),
        amount: round2(sub.packagePrice),
      }]
    : sub.lines;

  // Select and reserve the best eligible discount.
  // Product-specific discounts do not match the package line.
  let pick = null;

  for (const candidate of rank(ctx.discounts, discountLines)) {
    if (await reserve(candidate.discount)) {
      pick = candidate;
      break;
    }
  }

  let lines;

  if (isPackageSubscription) {
    const discountAmount = pick?.alloc[0] ?? 0;
    const packagePrice = round2(sub.packagePrice);
    const taxable = round2(packagePrice - discountAmount);
    const taxRate = Number(sub.taxRate || 0);
    const taxAmount = round2((taxable * taxRate) / 100);

    lines = [{
      name: `${sub.plan.name} - Subscription Package`,
      qty: 1,
      unitPrice: packagePrice,
      amount: packagePrice,
      discountAmount,
      taxName: sub.taxName,
      taxRate,
      taxAmount,
      total: round2(taxable + taxAmount),
    }];
  } else {
    // Backward-compatible billing for subscriptions created before package pricing.
    lines = sub.lines.map((line, index) => {
      const discountAmount = pick?.alloc[index] ?? 0;
      const taxable = round2(line.amount - discountAmount);
      const taxAmount = round2((taxable * line.taxRate) / 100);

      return {
        product: line.product,
        name: line.name,
        variantLabel: line.variantLabel,
        qty: line.qty,
        unitPrice: line.unitPrice,
        amount: line.amount,
        discountAmount,
        taxName: line.taxName,
        taxRate: line.taxRate,
        taxAmount,
        total: round2(taxable + taxAmount),
      };
    });
  }

  const subtotal = round2(
    lines.reduce((sum, line) => sum + line.amount, 0)
  );

  const discountTotal = round2(
    lines.reduce((sum, line) => sum + line.discountAmount, 0)
  );

  const taxTotal = round2(
    lines.reduce((sum, line) => sum + line.taxAmount, 0)
  );

  try {
    await Invoice.create({
      number: await nextNumber('invoice', 'INV'),
      subscription: sub._id,
      subscriptionNumber: sub.number,
      customer: sub.customer._id,
      customerName: sub.customer.name,
      customerEmail: sub.customer.email,
      periodStart,
      periodEnd,
      invoiceDate: ctx.asOf,
      dueDate: addDays(ctx.asOf, sub.paymentTermDays),
      status: ctx.autoConfirm ? 'Confirmed' : 'Draft',
      confirmedAt: ctx.autoConfirm ? ctx.asOf : undefined,
      lines,
      discountId: pick?.discount._id,
      discountName: pick?.discount.name,
      subtotal,
      discountTotal,
      taxTotal,
      total: round2(subtotal - discountTotal + taxTotal),
    });

    return true;
  } catch (error) {
    // Release the discount reservation if invoice creation fails.
    if (pick) {
      await release(pick.discount._id);
    }

    // The unique index protects against duplicate invoices during overlapping runs.
    if (error.code === 11000) {
      return false;
    }

    throw error;
  }
}

async function billSubscription(sub, ctx) {
  let created = 0;
  let skipped = 0;
  let guard = 0;

  while (
    sub.nextBillingDate <= ctx.asOf &&
    sub.nextBillingDate <= sub.expiryDate &&
    guard++ < MAX_CATCHUP
  ) {
    const periodStart = sub.nextBillingDate;
    const periodEnd = addPeriod(periodStart, sub.plan.period);

    (await createInvoice(sub, periodStart, periodEnd, ctx))
      ? created++
      : skipped++;

    // Advance only if another billing run has not already advanced this subscription.
    const moved = await Subscription.updateOne(
      { _id: sub._id, nextBillingDate: periodStart },
      { nextBillingDate: periodEnd }
    );

    if (!moved.modifiedCount) {
      break;
    }

    sub.nextBillingDate = periodEnd;
  }

  return { created, skipped };
}

// Plans with autoClose close their subscriptions after the expiry date.
export async function closeExpired(asOf) {
  const planIds = await Plan.distinct('_id', { autoClose: true });

  const result = await Subscription.updateMany(
    {
      status: 'Active',
      expiryDate: { $lt: asOf },
      plan: { $in: planIds },
    },
    {
      status: 'Closed',
      closedAt: asOf,
      paused: false,
    }
  );

  return result.modifiedCount;
}

export async function runBilling({
  asOf = new Date(),
  autoConfirm = false,
  subscription,
} = {}) {
  const summary = {
    asOf,
    created: 0,
    skipped: 0,
    failed: 0,
    closed: 0,
    errors: [],
  };

  const ctx = {
    asOf,
    autoConfirm,
    discounts: await loadDiscounts(asOf),
  };

  const filter = {
    status: 'Active',
    paused: false,
    nextBillingDate: { $lte: asOf },
  };

  if (subscription) {
    filter._id = subscription;
  }

  const processSubscription = async sub => {
    try {
      const result = await billSubscription(sub, ctx);

      summary.created += result.created;
      summary.skipped += result.skipped;
    } catch (error) {
      summary.failed++;

      if (summary.errors.length < 20) {
        summary.errors.push({
          subscription: sub.number,
          message: error.message,
        });
      }
    }
  };

  let batch = [];

  const cursor = Subscription.find(filter)
    .populate('plan', 'name period')
    .populate('customer', 'name email')
    .cursor();

  for await (const sub of cursor) {
    batch.push(sub);

    if (batch.length === BATCH) {
      await Promise.all(batch.map(processSubscription));
      batch = [];
    }
  }

  await Promise.all(batch.map(processSubscription));

  // Run after billing so an eligible final billing period is not skipped.
  summary.closed = await closeExpired(asOf);

  return summary;
}
