import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api';
import { useFetch } from '../hooks/useFetch';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import RecordPaymentModal, { methodLabel } from './RecordPaymentModal';
import { money, date, invoiceState } from '../utils/format';

export default function InvoiceDetail() {
  const { id } = useParams();
  const inv = useFetch(() => api.get(`/invoices/${id}`), [id]);
  const pays = useFetch(() => api.get('/payments', { params: { invoice: id, limit: 50 } }), [id]);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const i = inv.data;
  if (inv.error) return <div className="error">{inv.error}</div>;
  if (!i) return <div className="card muted">Loading...</div>;

  const reload = () => { inv.reload(); pays.reload(); };
  const act = async (path, ask, msg) => {
    if (ask && !window.confirm(ask)) return;
    setBusy(true); setError(''); setNotice('');
    try { await api.post(`/invoices/${id}/${path}`); if (msg) setNotice(msg); reload(); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const balance = i.total - i.amountPaid;
  const canCancel = ['Draft', 'Confirmed'].includes(i.status) && i.amountPaid === 0;

  return (
    <div>
      <PageHeader title={i.number}>
        <Link to="/invoices" className="btn">Back</Link>
        <a className="btn" href={`/api/invoices/${id}/print`} target="_blank" rel="noreferrer">Print</a>
        {['Confirmed', 'Paid'].includes(i.status) &&
          <button className="btn" disabled={busy} onClick={() => act('send', null, `Invoice sent to ${i.customerEmail}`)}>Send</button>}
        {i.status === 'Draft' && <button className="btn primary" disabled={busy} onClick={() => act('confirm')}>Confirm</button>}
        {i.status === 'Confirmed' && <button className="btn primary" disabled={busy} onClick={() => setPaying(true)}>Record payment</button>}
        {canCancel && <button className="btn danger" disabled={busy}
          onClick={() => act('cancel', 'Cancel this invoice? That billing period will not be billed again.')}>Cancel</button>}
      </PageHeader>

      {error && <div className="error">{error}</div>}
      {notice && <div className="success">{notice}</div>}

      <div className="card">
        <div className="info">
          <div><span className="label">State</span><StatusBadge status={invoiceState(i)} /></div>
          <div><span className="label">Customer</span>{i.customerName}<div className="muted">{i.customerEmail}</div></div>
          <div><span className="label">Subscription</span><Link to={`/subscriptions/${i.subscription}`}>{i.subscriptionNumber}</Link></div>
          <div><span className="label">Billing period</span>{date(i.periodStart)} to {date(i.periodEnd)}</div>
          <div><span className="label">Invoice date</span>{date(i.invoiceDate)}</div>
          <div><span className="label">Due date</span>{date(i.dueDate)}</div>
          {i.sentAt && <div><span className="label">Sent</span>{date(i.sentAt)}</div>}
          {i.paidAt && <div><span className="label">Paid on</span>{date(i.paidAt)}</div>}
        </div>
      </div>

      <div className="card" style={{ padding: 0, marginTop: 14 }}>
        <div className="card-head"><h2>Lines</h2></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Product</th><th>Qty</th><th>Unit price</th><th>Discount</th><th>Tax</th><th>Total</th></tr></thead>
            <tbody>
              {i.lines.map((l, k) => (
                <tr key={k}>
                  <td>{l.name}{l.variantLabel && <div className="muted">{l.variantLabel}</div>}</td>
                  <td>{l.qty}</td><td>{money(l.unitPrice)}</td>
                  <td>{l.discountAmount ? `- ${money(l.discountAmount)}` : '-'}</td>
                  <td>{l.taxName ? `${l.taxName} (${l.taxRate}%)` : '-'}</td><td>{money(l.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="totals">
          <div><span>Subtotal</span><span>{money(i.subtotal)}</span></div>
          <div><span>Discount{i.discountName ? ` (${i.discountName})` : ''}</span><span>- {money(i.discountTotal)}</span></div>
          <div><span>Tax</span><span>{money(i.taxTotal)}</span></div>
          <div className="grand"><span>Total</span><span>{money(i.total)}</span></div>
          <div><span>Paid</span><span>{money(i.amountPaid)}</span></div>
          <div><strong>Balance due</strong><strong>{i.status === 'Cancelled' ? '-' : money(balance)}</strong></div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, marginTop: 14 }}>
        <div className="card-head"><h2>Payments</h2></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Date</th><th>Method</th><th>Amount</th><th>Note</th></tr></thead>
            <tbody>
              {pays.data?.items.map(p => (
                <tr key={p._id}><td>{date(p.date)}</td><td style={{ textTransform: 'capitalize' }}>{methodLabel(p.method)}</td>
                  <td>{money(p.amount)}</td><td className="muted">{p.note || '-'}</td></tr>
              ))}
              {pays.data && !pays.data.items.length && <tr><td colSpan="4" className="muted">No payments recorded</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {paying && <RecordPaymentModal invoice={i} onClose={() => setPaying(false)}
        onDone={() => { setPaying(false); reload(); }} />}
    </div>
  );
}