import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useFetch } from '../hooks/useFetch';
import PageHeader from '../components/PageHeader';
import { money, date, isoDay, daysOverdue } from '../utils/format';

const today = () => new Date();
const PRESETS = {
  'This month': () => [new Date(today().getFullYear(), today().getMonth(), 1), today()],
  'Last 30 days': () => [new Date(Date.now() - 30 * 864e5), today()],
  'Last 90 days': () => [new Date(Date.now() - 90 * 864e5), today()],
  'This year': () => [new Date(today().getFullYear(), 0, 1), today()],
  'All time': () => ['', ''],
};

const Stat = ({ label, value, sub, tone }) => (
  <div className="card stat">
    <div className="label">{label}</div>
    <div className="value" style={tone && { color: `var(--${tone})` }}>{value}</div>
    {sub && <div className="muted">{sub}</div>}
  </div>
);

const Breakdown = ({ title, rows }) => {
  const max = Math.max(1, ...rows.map(r => r.value));
  return (
    <div className="card">
      <h2>{title}</h2>
      {!rows.length && <p className="muted">No data</p>}
      {rows.map(r => (
        <div key={r.label} className="bar-row">
          <div className="bar-top"><span>{r.label}</span><strong>{r.text}</strong></div>
          <div className="bar"><div style={{ width: `${(r.value / max) * 100}%` }} /></div>
        </div>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const [range, setRange] = useState({ from: '', to: '' });
  const [preset, setPreset] = useState('All time');

  const apply = name => {
    const [f, t] = PRESETS[name]();
    setPreset(name); setRange({ from: f && isoDay(f), to: t && isoDay(t) });
  };
  const custom = (k, v) => { setPreset(''); setRange(r => ({ ...r, [k]: v })); };

  const params = { from: range.from || undefined, to: range.to || undefined };
  const summary = useFetch(() => api.get('/reports/summary', { params }), [range.from, range.to]);
  const overdue = useFetch(() => api.get('/invoices', { params: { overdue: true, limit: 10 } }), []);

  const s = summary.data;
  const methodLabel = m => m.replace('_', ' ');

  return (
    <div>
      <PageHeader title="Dashboard" />

      <div className="card filters">
        <div className="chips">
          {Object.keys(PRESETS).map(p => (
            <button key={p} className={`btn small ${preset === p ? 'primary' : ''}`} onClick={() => apply(p)}>{p}</button>
          ))}
        </div>
        <div className="range">
          <label>From<input type="date" value={range.from} onChange={e => custom('from', e.target.value)} /></label>
          <label>To<input type="date" value={range.to} onChange={e => custom('to', e.target.value)} /></label>
        </div>
      </div>

      {summary.error && <div className="error">{summary.error}</div>}
      {!s ? <div className="card muted">Loading summary...</div> : (
        <>
          <div className="grid">
            <Stat label="Active subscriptions" value={s.subscriptions.active.toLocaleString()}
              sub={`of ${s.subscriptions.total.toLocaleString()} total`} />
            <Stat label="Revenue collected" value={money(s.revenue.collected)} tone="ok"
              sub={`${s.revenue.payments.toLocaleString()} payments`} />
            <Stat label="Outstanding" value={money(s.invoices.outstanding)} tone="warn"
              sub={`${s.invoices.outstandingCount.toLocaleString()} open invoices`} />
            <Stat label="Overdue" value={money(s.invoices.overdueAmount)} tone="bad"
              sub={`${s.invoices.overdueCount.toLocaleString()} invoices`} />
            <Stat label="Invoiced" value={money(s.invoices.invoiced)}
              sub={`${s.invoices.paidCount.toLocaleString()} fully paid`} />
          </div>

          <div className="grid three">
            <Breakdown title="Revenue by method"
              rows={s.revenue.byMethod.map(m => ({ label: methodLabel(m.method), value: m.amount, text: money(m.amount) }))} />
            <Breakdown title="Invoices by status"
              rows={Object.entries(s.invoices.byStatus).map(([k, v]) => ({ label: k, value: v, text: v.toLocaleString() }))} />
            <Breakdown title="Subscriptions by status"
              rows={Object.entries(s.subscriptions.byStatus).map(([k, v]) => ({ label: k, value: v, text: v.toLocaleString() }))} />
          </div>
        </>
      )}

      <div className="card" style={{ padding: 0 }}>
        <div className="card-head">
          <h2>Overdue invoices</h2>
          <Link to="/invoices?overdue=true">View all</Link>
        </div>
        {overdue.error && <div className="error">{overdue.error}</div>}
        <div className="table-wrap">
          <table>
            <thead><tr><th>Invoice</th><th>Customer</th><th>Due date</th><th>Days overdue</th><th>Balance</th></tr></thead>
            <tbody>
              {overdue.data?.items.map(i => (
                <tr key={i._id}>
                  <td><Link to={`/invoices?q=${i.number}`}>{i.number}</Link></td>
                  <td>{i.customerName}</td><td>{date(i.dueDate)}</td>
                  <td><span className="badge Overdue">{daysOverdue(i.dueDate)} days</span></td>
                  <td>{money(i.total - i.amountPaid)}</td>
                </tr>
              ))}
              {overdue.data && !overdue.data.items.length && <tr><td colSpan="5" className="muted">Nothing overdue</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}