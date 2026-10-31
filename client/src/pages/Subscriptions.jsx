import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { useFetch } from '../hooks/useFetch';
import { useDebounce } from '../hooks/useDebounce';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import Pagination from '../components/Pagination';
import CustomerPicker from '../components/CustomerPicker';
import NewSubscriptionModal from './NewSubscriptionModal';
import { money, date } from '../utils/format';

const STATUSES = ['Draft', 'Quotation', 'Confirmed', 'Active', 'Closed'];

export default function Subscriptions() {
  const nav = useNavigate();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [customer, setCustomer] = useState(null);
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(false);
  const dq = useDebounce(q);

  const { data, error, loading } = useFetch(() => api.get('/subscriptions', {
    params: { page, limit: 20, status: status || undefined, customer: customer?._id, q: dq || undefined },
  }), [page, status, customer?._id, dq]);

  const change = setter => v => { setter(v); setPage(1); };

  return (
    <div>
      <PageHeader title="Subscriptions">
        <button className="btn primary" onClick={() => setCreating(true)}>New subscription</button>
      </PageHeader>

      <div className="card filters">
        <label>Number<input placeholder="SUB-0001" value={q} onChange={e => change(setQ)(e.target.value)} /></label>
        <label>Status
          <select value={status} onChange={e => change(setStatus)(e.target.value)}>
            <option value="">All</option>{STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label style={{ minWidth: 260 }}>Customer
          <CustomerPicker value={customer} onChange={change(setCustomer)} />
        </label>
      </div>

      {error && <div className="error">{error}</div>}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Number</th><th>Customer</th><th>Plan</th><th>Status</th><th>Start</th><th>Expiry</th><th>Next billing</th><th>Total</th></tr></thead>
            <tbody>
              {data?.items.map(s => (
                <tr key={s._id} className="click" onClick={() => nav(`/subscriptions/${s._id}`)}>
                  <td><Link to={`/subscriptions/${s._id}`}>{s.number}</Link></td>
                  <td>{s.customer?.name}</td>
                  <td>{s.plan?.name} <span className="muted">{s.plan?.period}</span></td>
                  <td><StatusBadge status={s.status} />{s.paused && <span className="badge Quotation" style={{ marginLeft: 6 }}>Paused</span>}</td>
                  <td>{date(s.startDate)}</td><td>{date(s.expiryDate)}</td>
                  <td>{s.status === 'Active' ? date(s.nextBillingDate) : '-'}</td>
                  <td>{money(s.total)}</td>
                </tr>
              ))}
              {loading && !data && <tr><td colSpan="8" className="muted">Loading...</td></tr>}
              {data && !data.items.length && <tr><td colSpan="8" className="muted">No subscriptions found</td></tr>}
            </tbody>
          </table>
        </div>
        {data && <Pagination page={data.page} pages={data.pages} total={data.total} onPage={setPage} />}
      </div>

      {creating && <NewSubscriptionModal onClose={() => setCreating(false)}
        onCreated={s => nav(`/subscriptions/${s._id}`)} />}
    </div>
  );
}