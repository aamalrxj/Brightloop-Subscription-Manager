export const money = n =>
  '₹' + Number(n ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const date = d =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

export const isoDay = d => new Date(d).toISOString().slice(0, 10);

// what the UI shows for an invoice (the database only stores Draft/Confirmed/Paid/Cancelled)
export const invoiceState = inv => {
  if (inv.status !== 'Confirmed') return inv.status;
  if (new Date(inv.dueDate) < new Date()) return 'Overdue';
  return inv.amountPaid > 0 ? 'Partially paid' : 'Confirmed';
};

export const daysOverdue = due => Math.max(0, Math.floor((Date.now() - new Date(due)) / 864e5));