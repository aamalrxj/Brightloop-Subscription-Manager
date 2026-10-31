import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useFetch } from '../hooks/useFetch';
import PageHeader from '../components/PageHeader';
import Pagination from '../components/Pagination';
import CustomerPicker from '../components/CustomerPicker';
import { METHODS, methodLabel } from './RecordPaymentModal';
import { money, date } from '../utils/format';

export default function Payments() {
  const [page, setPage] = useState(1);
  const [method, setMethod] = useState('');
  const [customer, setCustomer] = useState(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const { data, error, loading } = useFetch(() => api.get('/payments', {
    params: { page, limit: 20, method: method || undefined, customer: customer?._id, from: from || undefined, to: to || undefined },
  }), [page, method, customer?._id, from, to]);

  const change = setter => v => { setter(v); setPage(1); };

  return (
    <div>
      <PageHeader title="Payments" />
      <div className="card filters">
        <label>Method
          <select value={method} onChange={e => change(setMethod)(e.target.value)}>
            <option value="">All</option>{METHODS.map(m => <option key={m} value={m}>{methodLabel(m)}</option>)}
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
            <thead><tr><th>Date</th><th>Invoice</th><th>Customer</th><th>Method</th><th>Amount</th><th>Note</th></tr></thead>
            <tbody>
              {data?.items.map(p => (
                <tr key={p._id}>
                  <td>{date(p.date)}</td>
                  <td><Link to={`/invoices?q=${p.invoiceNumber}`}>{p.invoiceNumber}</Link></td>
                  <td>{p.customer?.name}</td>
                  <td style={{ textTransform: 'capitalize' }}>{methodLabel(p.method)}</td>
                  <td>{money(p.amount)}</td><td className="muted">{p.note || '-'}</td>
                </tr>
              ))}
              {loading && !data && <tr><td colSpan="6" className="muted">Loading...</td></tr>}
              {data && !data.items.length && <tr><td colSpan="6" className="muted">No payments found</td></tr>}
            </tbody>
          </table>
        </div>
        {data && <Pagination page={data.page} pages={data.pages} total={data.total} onPage={setPage} />}
      </div>
    </div>
  );
}