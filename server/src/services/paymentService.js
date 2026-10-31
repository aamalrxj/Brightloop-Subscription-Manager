import Invoice from '../models/Invoice.js';
import Payment from '../models/Payment.js';
import { round2 } from './pricing.js';
import { httpError } from '../utils/http.js';

export async function recordPayment({ invoice: invoiceId, method, amount, date, note }, userId) {
  amount = round2(amount);

  const inv = await Invoice.findById(invoiceId).select('number customer status total amountPaid').lean();
  if (!inv) throw httpError(404, 'Invoice not found');
  if (inv.status === 'Draft') throw httpError(400, 'Confirm the invoice before recording a payment');
  if (inv.status === 'Paid') throw httpError(400, 'Invoice is already fully paid');
  if (inv.status !== 'Confirmed') throw httpError(400, `Cannot record a payment on a ${inv.status} invoice`);

  const balance = round2(inv.total - inv.amountPaid);
  if (amount > balance) throw httpError(400, `Amount exceeds the balance due (${balance})`);

  const payment = await Payment.create({
    invoice: inv._id, invoiceNumber: inv.number, customer: inv.customer,
    method, amount, date, note, recordedBy: userId,
  });

  // atomic: add the amount and flip to Paid in one guarded update, so two clerks
  // paying at the same moment can never overpay the invoice
  const total = { $round: [{ $add: ['$amountPaid', amount] }, 2] };
  const updated = await Invoice.findOneAndUpdate(
    { _id: inv._id, status: 'Confirmed', $expr: { $lte: [total, '$total'] } },
    [
      { $set: { amountPaid: total } },
      { $set: {
          status: { $cond: [{ $gte: ['$amountPaid', '$total'] }, 'Paid', 'Confirmed'] },
          paidAt: { $cond: [{ $gte: ['$amountPaid', '$total'] }, date, '$paidAt'] },
      } },
    ],
    { new: true },
  );

  if (!updated) {                                          // lost a race, undo the payment row
    await Payment.deleteOne({ _id: payment._id });
    throw httpError(409, 'The invoice changed while recording the payment, please retry');
  }
  return { payment, invoice: updated };
}