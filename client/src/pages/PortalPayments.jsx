
import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useFetch } from '../hooks/useFetch';
import PageHeader from '../components/PageHeader';
import Pagination from '../components/Pagination';
import { money, date } from '../utils/format';

const methodLabel = method => ({
  cash: 'Cash',
  bank_transfer: 'Bank transfer',
  card: 'Card',
  upi: 'UPI',
  cheque: 'Cheque',
  other: 'Other',
}[method] || method || '-');

export default function PortalPayments() {
  const [page, setPage] = useState(1);

  const { data, loading, error } = useFetch(
    () => api.get('/portal/payments', {
      params: { page, limit: 20 },
    }),
    [page]
  );

  return (
    <div>
      <PageHeader title="My payments" />

      {error && <div className="error">{error}</div>}

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Payment date</th>
                <th>Invoice</th>
                <th>Payment method</th>
                <th>Amount</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map(payment => (
                <tr key={payment._id}>
                  <td>{date(payment.date)}</td>
                  <td>
                    <Link to={`/portal/invoices`}>
                      {payment.invoiceNumber || '-'}
                    </Link>
                  </td>
                  <td>{methodLabel(payment.method)}</td>
                  <td><strong>{money(payment.amount)}</strong></td>
                  <td className="muted">{payment.note || '-'}</td>
                </tr>
              ))}

              {loading && !data && (
                <tr><td colSpan="5" className="muted">Loading payments...</td></tr>
              )}
              {data && !data.items.length && (
                <tr><td colSpan="5" className="muted">You don't have any payment records yet.</td></tr>
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
