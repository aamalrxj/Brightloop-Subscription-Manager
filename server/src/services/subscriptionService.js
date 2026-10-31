
import User from '../models/User.js';
import Plan from '../models/Plan.js';
import Tax from '../models/Tax.js';
import QuotationTemplate from '../models/QuotationTemplate.js';
import Subscription from '../models/Subscription.js';
import { priceLines, packageTotals } from './pricing.js';
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
  if (startDate < plan.availableFrom || startDate > plan.availableTo) {
    throw httpError(
      400,
      'This plan is not available on the chosen start date'
    );
  }
};

const toInput = lines =>
  lines.map(line => ({
    product: line.product,
    variant: line.variant,
    qty: line.qty,
  }));

async function getActivePlan(planId) {
  const plan = await Plan.findOne({
    _id: planId,
    active: true,
  }).lean();

  if (!plan) {
    throw httpError(400, 'Plan not found or inactive');
  }

  if (plan.tax) {
    const tax = await Tax.findOne({
      _id: plan.tax,
      active: true,
    }).lean();

    if (!tax) {
      throw httpError(
        400,
        'The tax assigned to this plan is inactive. Select an active tax.'
      );
    }

    plan.tax = tax;
  }

  return plan;
}

async function priceSubscriptionLines(lines, plan) {
  const pricedLines = await priceLines(lines, plan);
  const totals = packageTotals(plan);

  return {
    lines: pricedLines,
    ...totals,
  };
}

export async function createSubscription(data) {
  const customer = await User.findOne({
    _id: data.customer,
    role: 'customer',
  }).lean();

  if (!customer) {
    throw httpError(400, 'Customer not found');
  }

  let planId = data.plan;
  let lines = data.lines;
  let validityDays = 30;

  if (data.template) {
    const template = await QuotationTemplate.findOne({
      _id: data.template,
      active: true,
    }).lean();

    if (!template) {
      throw httpError(400, 'Quotation template not found');
    }

    planId ??= template.plan;
    lines ??= toInput(template.lines);
    validityDays = template.validityDays;
  }

  if (!planId) {
    throw httpError(400, 'Plan is required');
  }

  const plan = await getActivePlan(planId);

  assertWindow(plan, data.startDate);

  const expiryDate = data.expiryDate ?? plan.availableTo;

  if (expiryDate < data.startDate) {
    throw httpError(400, 'Expiry date must be after start date');
  }

  const priced = await priceSubscriptionLines(lines, plan);

  return Subscription.create({
    number: await nextNumber('subscription', 'SUB'),
    customer: customer._id,
    plan: plan._id,
    template: data.template,
    startDate: data.startDate,
    expiryDate,
    paymentTermDays: data.paymentTermDays,
    validityDays,
    ...priced,
  });
}

export async function updateDraft(sub, data) {
  if (sub.status !== 'Draft') {
    throw httpError(400, 'Only Draft subscriptions can be edited');
  }

  const plan = await getActivePlan(data.plan ?? sub.plan);

  const startDate = data.startDate ?? sub.startDate;
  const expiryDate = data.expiryDate ?? sub.expiryDate;

  assertWindow(plan, startDate);

  if (expiryDate < startDate) {
    throw httpError(400, 'Expiry date must be after start date');
  }

  sub.set({
    plan: plan._id,
    startDate,
    expiryDate,
    paymentTermDays: data.paymentTermDays ?? sub.paymentTermDays,
  });

  if (data.lines || data.plan) {
    const priced = await priceSubscriptionLines(
      data.lines ?? toInput(sub.lines),
      plan
    );

    sub.set(priced);
  }

  return sub.save();
}

export async function transition(sub, to) {
  if (!FLOW[sub.status].includes(to)) {
    throw httpError(
      400,
      `Cannot move a ${sub.status} subscription to ${to}`
    );
  }

  if (to === 'Quotation') {
    sub.quotationExpiry = addDays(new Date(), sub.validityDays);
  }

  if (to === 'Confirmed' && sub.quotationExpiry < new Date()) {
    throw httpError(400, 'This quotation has expired');
  }

  if (to === 'Active') {
    sub.nextBillingDate = sub.startDate;
    sub.paused = false;
  }

  if (to === 'Closed') {
    if (sub.status === 'Active') {
      const plan = await Plan.findById(sub.plan).lean();

      if (!plan.closable) {
        throw httpError(400, 'This plan cannot be closed early');
      }
    }

    sub.closedAt = new Date();
    sub.paused = false;
  }

  sub.status = to;
  return sub.save();
}

async function activeWithPlan(sub) {
  if (sub.status !== 'Active') {
    throw httpError(400, 'Subscription is not Active');
  }

  return Plan.findById(sub.plan).lean();
}

export async function pause(sub) {
  const plan = await activeWithPlan(sub);

  if (!plan.pausable) {
    throw httpError(400, 'This plan cannot be paused');
  }

  if (sub.paused) {
    throw httpError(400, 'Already paused');
  }

  sub.paused = true;
  return sub.save();
}

export async function resume(sub) {
  await activeWithPlan(sub);

  if (!sub.paused) {
    throw httpError(400, 'Subscription is not paused');
  }

  sub.paused = false;

  // Do not back-bill the paused period.
  if (sub.nextBillingDate < new Date()) {
    sub.nextBillingDate = new Date();
  }

  return sub.save();
}

export async function renew(sub) {
  const plan = await activeWithPlan(sub);

  if (!plan.renewable) {
    throw httpError(400, 'This plan cannot be renewed');
  }

  sub.expiryDate = addPeriod(sub.expiryDate, plan.period);
  return sub.save();
}
