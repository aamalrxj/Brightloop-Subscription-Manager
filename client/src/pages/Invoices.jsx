import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api';
import { useFetch } from '../hooks/useFetch';
import { useDebounce } from '../hooks/useDebounce';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import Pagination from '../components/Pagination';
import CustomerPicker from '../components/CustomerPicker';
import RunBillingModal from './RunBillingModal';
import { money, date, invoiceState } from '../utils/format';

const STATES = ['Draft', 'Confirmed', 'Partially paid', 'Overdue', 'Paid', 'Cancelled'];

// the list can be opened pre-filtered, e.g. /invoices?overdue=true or /invoices?q=INV-0007
export default function Invoices() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState(sp.get('q') || '');
  const [state, setState] = useState(sp.get('overdue') === 'true' ? 'Overdue' : '');
  const [customer, setCustomer] = useState(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [billing, setBilling] = useState(false);
  const dq = useDebounce(q);

  const params = {
    page, limit: 20, q: dq || undefined, customer: customer?._id,
    from: from || undefined, to: to || undefined,
    ...(state === 'Overdue' ? { overdue: true } : state === 'Partially paid' ? { partial: true } : state ? { status: state } : {}),
  };
  const { data, error, loading, reload } = useFetch(() => api.get('/invoices', { params }),
    [page, dq, state, customer?._id, from, to]);

  const change = setter => v => { setter(v); setPage(1); };

  return (
    <div>
      <PageHeader title="Invoices">
        <button className="btn primary" onClick={() => setBilling(true)}>Run billing</button>
      </PageHeader>

      <div className="card filters">
        <label>Number<input placeholder="INV-0001" value={q} onChange={e => change(setQ)(e.target.value)} /></label>
        <label>State
          <select value={state} onChange={e => change(setState)(e.target.value)}>
            <option value="">All</option>{STATES.map(s => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label style={{ minWidth: 240 }}>Customer<CustomerPicker value={customer} onChange={change(setCustomer)} /></label>
        <label>From<input type="date" value={from} onChange={e => change(setFrom)(e.target.value)} /></label>
        <label>To<input type="date" value={to} onChange={e => change(setTo)(e.target.value)} /></label>
      </div>

      {error && <div className="error">{error}</div>}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Invoice</th><th>Customer</th><th>Subscription</th><th>Invoice date</th><th>Due</th><th>State</th><th>Total</th><th>Balance</th></tr></thead>
            <tbody>
              {data?.items.map(i => (
                <tr key={i._id} className="click" onClick={() => nav(`/invoices/${i._id}`)}>
                  <td><Link to={`/invoices/${i._id}`}>{i.number}</Link></td>
                  <td>{i.customerName}</td><td>{i.subscriptionNumber}</td>
                  <td>{date(i.invoiceDate)}</td><td>{date(i.dueDate)}</td>
                  <td><StatusBadge status={invoiceState(i)} /></td>
                  <td>{money(i.total)}</td>
                  <td>{i.status === 'Cancelled' ? '-' : money(i.total - i.amountPaid)}</td>
                </tr>
              ))}
              {loading && !data && <tr><td colSpan="8" className="muted">Loading...</td></tr>}
              {data && !data.items.length && <tr><td colSpan="8" className="muted">No invoices found</td></tr>}
            </tbody>
          </table>
        </div>
        {data && <Pagination page={data.page} pages={data.pages} total={data.total} onPage={setPage} />}
      </div>

      {billing && <RunBillingModal onClose={() => setBilling(false)} onDone={reload} />}
    </div>
  );
}