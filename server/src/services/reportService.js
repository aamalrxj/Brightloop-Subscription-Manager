import mongoose from 'mongoose';
import Subscription from '../models/Subscription.js';
import Invoice from '../models/Invoice.js';
import Payment from '../models/Payment.js';
import { round2 } from './pricing.js';

const range = (field, from, to) =>
  from || to ? { [field]: { ...(from && { $gte: from }), ...(to && { $lte: to }) } } : {};

export async function getSummary({ from, to, customer } = {}) {
  const now = new Date();
  const cust = customer ? { customer: new mongoose.Types.ObjectId(customer) } : {};

  const [subs, inv, pay] = await Promise.all([
    Subscription.aggregate([
      { $match: cust },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Invoice.aggregate([
      { $match: { ...cust, ...range('invoiceDate', from, to) } },
      { $facet: {
        byStatus: [{ $group: { _id: '$status', count: { $sum: 1 },
          total: { $sum: '$total' }, paid: { $sum: '$amountPaid' } } }],
        overdue: [
          { $match: { status: 'Confirmed', dueDate: { $lt: now } } },
          { $group: { _id: null, count: { $sum: 1 },
            amount: { $sum: { $subtract: ['$total', '$amountPaid'] } } } },
        ],
      } },
    ]),
    Payment.aggregate([
      { $match: { ...cust, ...range('date', from, to) } },
      { $facet: {
        total: [{ $group: { _id: null, amount: { $sum: '$amount' }, count: { $sum: 1 } } }],
        byMethod: [
          { $group: { _id: '$method', amount: { $sum: '$amount' }, count: { $sum: 1 } } },
          { $sort: { amount: -1 } },
        ],
      } },
    ]),
  ]);

  const subByStatus = Object.fromEntries(subs.map(s => [s._id, s.count]));
  const invByStatus = Object.fromEntries(inv[0].byStatus.map(s => [s._id, s]));
  const open = invByStatus.Confirmed ?? { count: 0, total: 0, paid: 0 };
  const paid = invByStatus.Paid ?? { count: 0, total: 0 };
  const od = inv[0].overdue[0] ?? { count: 0, amount: 0 };
  const p = pay[0].total[0] ?? { amount: 0, count: 0 };

  return {
    subscriptions: {
      active: subByStatus.Active ?? 0,
      total: Object.values(subByStatus).reduce((a, b) => a + b, 0),
      byStatus: subByStatus,
    },
    revenue: {
      collected: round2(p.amount), payments: p.count,
      byMethod: pay[0].byMethod.map(m => ({ method: m._id, amount: round2(m.amount), count: m.count })),
    },
    invoices: {
      invoiced: round2(open.total + paid.total),
      outstanding: round2(open.total - open.paid), outstandingCount: open.count,
      paidCount: paid.count,
      overdueCount: od.count, overdueAmount: round2(od.amount),
      byStatus: Object.fromEntries(Object.entries(invByStatus).map(([k, v]) => [k, v.count])),
    },
  };
}