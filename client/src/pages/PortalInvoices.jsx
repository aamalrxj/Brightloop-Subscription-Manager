
import { useState } from 'react';
import api from '../api';
import { useFetch } from '../hooks/useFetch';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import Pagination from '../components/Pagination';
import { money, date, invoiceState } from '../utils/format';

export default function PortalInvoices() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');

  const { data, loading, error } = useFetch(
    () => api.get('/portal/invoices', {
      params: { page, limit: 20, status: status || undefined },
    }),
    [page, status]
  );

  const printInvoice = id => {
    window.open(`/api/portal/invoices/${id}/print`, '_blank', 'noopener,noreferrer');
  };

  const changeStatus = value => {
    setStatus(value);
    setPage(1);
  };

  return (
    <div>
      <PageHeader title="My invoices" />

      <div className="card filters">
        <label>
          Invoice status
          <select value={status} onChange={e => changeStatus(e.target.value)}>
            <option value="">All invoices</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Paid">Paid</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </label>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Subscription</th>
                <th>Invoice date</th>
                <th>Due date</th>
                <th>Status</th>
                <th>Total</th>
                <th>Paid</th>
                <th>Balance</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map(invoice => {
                const balance = Math.max(0, Number(invoice.total || 0) - Number(invoice.amountPaid || 0));

                return (
                  <tr key={invoice._id}>
                    <td>{invoice.number}</td>
                    <td>{invoice.subscriptionNumber || '-'}</td>
                    <td>{date(invoice.invoiceDate)}</td>
                    <td>{date(invoice.dueDate)}</td>
                    <td><StatusBadge status={invoiceState(invoice)} /></td>
                    <td>{money(invoice.total)}</td>
                    <td>{money(invoice.amountPaid)}</td>
                    <td>{invoice.status === 'Cancelled' ? '-' : money(balance)}</td>
                    <td>
                      <button
                        className="btn small"
                        disabled={invoice.status === 'Cancelled'}
                        onClick={() => printInvoice(invoice._id)}
                      >
                        Print
                      </button>
                    </td>
                  </tr>
                );
              })}

              {loading && !data && (
                <tr><td colSpan="9" className="muted">Loading invoices...</td></tr>
              )}
              {data && !data.items.length && (
                <tr><td colSpan="9" className="muted">You don't have any invoices yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {data && (
          <Pagination
            page={data.page}
            pages={data.pages}
            total={data.total}
            onPage={setPage}
          />
        )}
      </div>
    </div>
  );
}
