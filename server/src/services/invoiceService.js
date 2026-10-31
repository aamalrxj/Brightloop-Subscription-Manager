
import { release } from './discounts.js';
import { sendEmail } from './emailService.js';
import { invoiceHtml } from './invoiceHtml.js';
import { httpError } from '../utils/http.js';

// Paid is set only by the payment service.
const FLOW = {
  Draft: ['Confirmed', 'Cancelled'],
  Confirmed: ['Paid', 'Cancelled'],
  Paid: [],
  Cancelled: [],
};

export async function confirm(inv) {
  if (!FLOW[inv.status].includes('Confirmed')) {
    throw httpError(400, `Cannot confirm a ${inv.status} invoice`);
  }

  inv.status = 'Confirmed';
  inv.confirmedAt = new Date();

  return inv.save();
}

export async function cancel(inv) {
  if (!FLOW[inv.status].includes('Cancelled')) {
    throw httpError(400, `Cannot cancel a ${inv.status} invoice`);
  }

  if (inv.amountPaid > 0) {
    throw httpError(400, 'Cannot cancel an invoice that has payments');
  }

  inv.status = 'Cancelled';
  await inv.save();

  if (inv.discountId) {
    await release(inv.discountId);
  }

  return inv;
}

export async function send(inv) {
  if (!['Confirmed', 'Paid'].includes(inv.status)) {
    throw httpError(400, 'Confirm the invoice before sending it');
  }

  if (inv.sentAt) {
    throw httpError(400, 'This invoice has already been sent');
  }

  if (!inv.customerEmail) {
    throw httpError(400, 'Customer email address is missing');
  }

  const html = invoiceHtml(inv);

  const text = [
    `Hello ${inv.customerName || 'Customer'},`,
    '',
    `Your Brightloop Software invoice ${inv.number} is ready.`,
    `Invoice total: ₹${Number(inv.total || 0).toFixed(2)}`,
    `Amount paid: ₹${Number(inv.amountPaid || 0).toFixed(2)}`,
    `Balance due: ₹${Number(
      (inv.total || 0) - (inv.amountPaid || 0)
    ).toFixed(2)}`,
    '',
    'Please find your invoice details in the HTML email.',
    '',
    'Brightloop Software',
  ].join('\n');

  // Only mark the invoice as sent after successful email delivery.
  await sendEmail({
    to: inv.customerEmail,
    subject: `Brightloop Invoice ${inv.number}`,
    text,
    html,
  });

  inv.sentAt = new Date();

  return inv.save();
}
