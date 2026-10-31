import User from '../models/User.js';
import Plan from '../models/Plan.js';
import QuotationTemplate from '../models/QuotationTemplate.js';
import Subscription from '../models/Subscription.js';
import { priceLines, totals } from './pricing.js';
import { nextNumber } from '../utils/numbering.js';
import { addDays, addPeriod } from '../utils/dates.js';
import { httpError } from '../utils/http.js';

const FLOW = {
  Draft: ['Quotation', 'Closed'],
  Quotation: ['Confirmed', 'Closed'],
  Confirmed: ['Active', 'Closed'],
  Active: ['Closed'],
  Closed: [],
};

const assertWindow = (plan, startDate) => {
  if (startDate < plan.availableFrom || startDate > plan.availableTo)
    throw httpError(400, 'This plan is not available on the chosen start date');
};

const toInput = lines => lines.map(l => ({ product: l.product, variant: l.variant, qty: l.qty }));

export async function createSubscription(data) {
  const customer = await User.findOne({ _id: data.customer, role: 'customer' }).lean();
  if (!customer) throw httpError(400, 'Customer not found');

  let planId = data.plan, lines = data.lines, validityDays = 30;
  if (data.template) {
    const t = await QuotationTemplate.findOne({ _id: data.template, active: true }).lean();
    if (!t) throw httpError(400, 'Quotation template not found');
    planId ??= t.plan;
    lines ??= toInput(t.lines);
    validityDays = t.validityDays;
  }
  if (!planId) throw httpError(400, 'Plan is required');

  const plan = await Plan.findOne({ _id: planId, active: true }).lean();
  if (!plan) throw httpError(400, 'Plan not found');
  assertWindow(plan, data.startDate);

  const expiryDate = data.expiryDate ?? plan.availableTo;
  if (expiryDate < data.startDate) throw httpError(400, 'Expiry date must be after start date');

  const priced = await priceLines(lines, plan);
  return Subscription.create({
    number: await nextNumber('subscription', 'SUB'),
    customer: customer._id, plan: plan._id, template: data.template,
    startDate: data.startDate, expiryDate, paymentTermDays: data.paymentTermDays,
    validityDays, lines: priced, ...totals(priced),
  });
}

export async function updateDraft(sub, data) {
  if (sub.status !== 'Draft') throw httpError(400, 'Only Draft subscriptions can be edited');

  const plan = await Plan.findById(data.plan ?? sub.plan).lean();
  if (!plan) throw httpError(400, 'Plan not found');
  const startDate = data.startDate ?? sub.startDate;
  const expiryDate = data.expiryDate ?? sub.expiryDate;
  assertWindow(plan, startDate);
  if (expiryDate < startDate) throw httpError(400, 'Expiry date must be after start date');

  sub.set({ plan: plan._id, startDate, expiryDate, paymentTermDays: data.paymentTermDays ?? sub.paymentTermDays });
  if (data.lines || data.plan) {
    const priced = await priceLines(data.lines ?? toInput(sub.lines), plan);
    sub.lines = priced;
    sub.set(totals(priced));
  }
  return sub.save();
}

export async function transition(sub, to) {
  if (!FLOW[sub.status].includes(to))
    throw httpError(400, `Cannot move a ${sub.status} subscription to ${to}`);

  if (to === 'Quotation') sub.quotationExpiry = addDays(new Date(), sub.validityDays);
  if (to === 'Confirmed' && sub.quotationExpiry < new Date())
    throw httpError(400, 'This quotation has expired');
  if (to === 'Active') { sub.nextBillingDate = sub.startDate; sub.paused = false; }
  if (to === 'Closed') {
    if (sub.status === 'Active') {
      const plan = await Plan.findById(sub.plan).lean();
      if (!plan.closable) throw httpError(400, 'This plan cannot be closed early');
    }
    sub.closedAt = new Date();
    sub.paused = false;
  }
  sub.status = to;
  return sub.save();
}

async function activeWithPlan(sub) {
  if (sub.status !== 'Active') throw httpError(400, 'Subscription is not Active');
  return Plan.findById(sub.plan).lean();
}

export async function pause(sub) {
  const plan = await activeWithPlan(sub);
  if (!plan.pausable) throw httpError(400, 'This plan cannot be paused');
  if (sub.paused) throw httpError(400, 'Already paused');
  sub.paused = true;
  return sub.save();
}

export async function resume(sub) {
  await activeWithPlan(sub);
  if (!sub.paused) throw httpError(400, 'Subscription is not paused');
  sub.paused = false;
  // do not back-bill the paused period
  if (sub.nextBillingDate < new Date()) sub.nextBillingDate = new Date();
  return sub.save();
}

export async function renew(sub) {
  const plan = await activeWithPlan(sub);
  if (!plan.renewable) throw httpError(400, 'This plan cannot be renewed');
  sub.expiryDate = addPeriod(sub.expiryDate, plan.period);
  return sub.save();
}