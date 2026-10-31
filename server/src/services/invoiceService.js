import Discount from '../models/Discount.js';
import { release } from './discounts.js';
import { httpError } from '../utils/http.js';

// Paid is set only by the payment service (step 5), never by hand
const FLOW = { Draft: ['Confirmed', 'Cancelled'], Confirmed: ['Paid', 'Cancelled'], Paid: [], Cancelled: [] };

export async function confirm(inv) {
  if (!FLOW[inv.status].includes('Confirmed'))
    throw httpError(400, `Cannot confirm a ${inv.status} invoice`);
  inv.status = 'Confirmed';
  inv.confirmedAt = new Date();
  return inv.save();
}

export async function cancel(inv) {
  if (!FLOW[inv.status].includes('Cancelled'))
    throw httpError(400, `Cannot cancel a ${inv.status} invoice`);
  if (inv.amountPaid > 0) throw httpError(400, 'Cannot cancel an invoice that has payments');
  inv.status = 'Cancelled';
  await inv.save();
  if (inv.discountId) await release(inv.discountId);           // cancelled invoice returns the discount use
  return inv;
}

export async function send(inv) {
  if (!['Confirmed', 'Paid'].includes(inv.status))
    throw httpError(400, 'Confirm the invoice before sending it');
  inv.sentAt = new Date();
  await inv.save();
  console.log(`EMAIL: invoice ${inv.number} sent to ${inv.customerEmail}`);   // faked delivery
  return inv;
}