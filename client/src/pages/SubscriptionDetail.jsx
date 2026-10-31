import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api';
import { useFetch } from '../hooks/useFetch';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import { money, date, invoiceState } from '../utils/format';

const STEPS = ['Draft', 'Quotation', 'Confirmed', 'Active', 'Closed'];

export default function SubscriptionDetail() {
  const { id } = useParams();
  const sub = useFetch(() => api.get(`/subscriptions/${id}`), [id]);
  const invs = useFetch(() => api.get('/invoices', { params: { subscription: id, limit: 20 } }), [id]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const s = sub.data;
  if (sub.error) return <div className="error">{sub.error}</div>;
  if (!s) return <div className="card muted">Loading...</div>;

  const act = async (path, ask) => {
    if (ask && !window.confirm(ask)) return;
    setBusy(true); setError('');
    try { await api.post(`/subscriptions/${id}/${path}`); sub.reload(); invs.reload(); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  const Btn = ({ path, label, ask, kind = '' }) =>
    <button className={`btn ${kind}`} disabled={busy} onClick={() => act(path, ask)}>{label}</button>;

  const p = s.plan;
  const cur = STEPS.indexOf(s.status);

  return (
    <div>
      <PageHeader title={s.number}>
        <Link to="/subscriptions" className="btn">Back</Link>
        {s.status === 'Draft' && <><Btn path="send" label="Send quotation" kind="primary" />
          <Btn path="close" label="Cancel" kind="danger" ask="Cancel this subscription?" /></>}
        {s.status === 'Quotation' && <><Btn path="confirm" label="Confirm" kind="primary" />
          <Btn path="close" label="Cancel" kind="danger" ask="Cancel this subscription?" /></>}
        {s.status === 'Confirmed' && <><Btn path="activate" label="Activate" kind="primary" />
          <Btn path="close" label="Cancel" kind="danger" ask="Cancel this subscription?" /></>}
        {s.status === 'Active' && <>
          {p.pausable && (s.paused ? <Btn path="resume" label="Resume" kind="primary" /> : <Btn path="pause" label="Pause" />)}
          {p.renewable && <Btn path="renew" label="Renew" ask="Extend the expiry date by one plan period?" />}
          {p.closable && <Btn path="close" label="Close early" kind="danger" ask="Close this subscription? Billing will stop." />}
        </>}
      </PageHeader>

      {error && <div className="error">{error}</div>}

      <div className="card">
        <div className="stepper">
          {STEPS.map((st, i) => (
            <div key={st} className={`step ${i < cur ? 'done' : ''} ${i === cur ? 'current' : ''}`}>
              <span className="dot">{i < cur ? '✓' : i + 1}</span>{st}
            </div>
          ))}
        </div>
        <div className="info">
          <div><span className="label">Status</span><StatusBadge status={s.status} />{s.paused && <span className="badge Quotation" style={{ marginLeft: 6 }}>Paused</span>}</div>
          <div><span className="label">Customer</span>{s.customer?.name}<div className="muted">{s.customer?.email}</div></div>
          <div><span className="label">Plan</span>{p.name}<div className="muted">{p.period}, plan price {money(p.price)}</div></div>
          <div><span className="label">Start date</span>{date(s.startDate)}</div>
          <div><span className="label">Expiry date</span>{date(s.expiryDate)}</div>
          <div><span className="label">Payment terms</span>{s.paymentTermDays ? `${s.paymentTermDays} days` : 'Due on receipt'}</div>
          {s.status === 'Quotation' && <div><span className="label">Quotation valid until</span>{date(s.quotationExpiry)}</div>}
          {s.status === 'Active' && <div><span className="label">Next billing</span>{date(s.nextBillingDate)}</div>}
        </div>
      </div>

      <div className="card" style={{ padding: 0, marginTop: 14 }}>
        <div className="card-head"><h2>Lines</h2></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Product</th><th>Qty</th><th>Unit price</th><th>Tax</th><th>Amount</th></tr></thead>
            <tbody>
              {s.lines.map((l, i) => (
                <tr key={i}>
                  <td>{l.name}{l.variantLabel && <div className="muted">{l.variantLabel}</div>}</td>
                  <td>{l.qty}</td><td>{money(l.unitPrice)}</td>
                  <td>{l.taxName ? `${l.taxName} (${l.taxRate}%)` : '-'}</td><td>{money(l.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="totals">
          <div><span>Subtotal</span><span>{money(s.subtotal)}</span></div>
          <div><span>Tax</span><span>{money(s.taxTotal)}</span></div>
          <div className="grand"><span>Total per period</span><span>{money(s.total)}</span></div>
          <p className="muted" style={{ margin: '6px 0 0' }}>Discounts are applied automatically on each invoice.</p>
        </div>
      </div>

      <div className="card" style={{ padding: 0, marginTop: 14 }}>
        <div className="card-head"><h2>Invoices</h2></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Invoice</th><th>Period</th><th>Due</th><th>State</th><th>Total</th><th>Balance</th></tr></thead>
            <tbody>
              {invs.data?.items.map(i => (
                <tr key={i._id}>
                  <td><Link to={`/invoices?q=${i.number}`}>{i.number}</Link></td>
                  <td>{date(i.periodStart)} to {date(i.periodEnd)}</td><td>{date(i.dueDate)}</td>
                  <td><StatusBadge status={invoiceState(i)} /></td>
                  <td>{money(i.total)}</td><td>{money(i.total - i.amountPaid)}</td>
                </tr>
              ))}
              {invs.data && !invs.data.items.length && <tr><td colSpan="6" className="muted">No invoices yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}