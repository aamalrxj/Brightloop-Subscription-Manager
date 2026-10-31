
import { Link } from 'react-router-dom';
import api from '../api';
import { useFetch } from '../hooks/useFetch';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import { money, date, invoiceState } from '../utils/format';

const Stat = ({ label, value, sub, tone }) => (
  <div className="card stat">
    <div className="label">{label}</div>
    <div className="value" style={tone ? { color: `var(--${tone})` } : undefined}>
      {value}
    </div>
    {sub && <div className="muted">{sub}</div>}
  </div>
);

export default function Portal() {
  const summary = useFetch(() => api.get('/portal/summary'), []);
  const subscriptions = useFetch(
    () => api.get('/portal/subscriptions', { params: { page: 1, limit: 5 } }),
    []
  );
  const invoices = useFetch(
    () => api.get('/portal/invoices', { params: { page: 1, limit: 5 } }),
    []
  );
  const payments = useFetch(
    () => api.get('/portal/payments', { params: { page: 1, limit: 5 } }),
    []
  );

  const s = summary.data;

  return (
    <div>
      <PageHeader title="Customer overview" />

      {summary.error && <div className="error">{summary.error}</div>}

      {!s ? (
        !summary.error && <div className="card muted">Loading your account summary...</div>
      ) : (
        <>
          <div className="grid">
            <Stat
              label="Active subscriptions"
              value={s.subscriptions.active.toLocaleString()}
              sub={`Of ${s.subscriptions.total.toLocaleString()} total subscriptions`}
            />

            <Stat
              label="Payments made"
              value={money(s.revenue.collected)}
              sub={`${s.revenue.payments.toLocaleString()} payment records`}
              tone="ok"
            />

            <Stat
              label="Outstanding balance"
              value={money(s.invoices.outstanding)}
              sub={`${s.invoices.outstandingCount.toLocaleString()} open invoices`}
              tone="warn"
            />

            <Stat
              label="Overdue amount"
              value={money(s.invoices.overdueAmount)}
              sub={`${s.invoices.overdueCount.toLocaleString()} overdue invoices`}
              tone="bad"
            />

            <Stat
              label="Total invoiced"
              value={money(s.invoices.invoiced)}
              sub={`${(s.invoices.byStatus.Paid || 0).toLocaleString()} fully paid invoices`}
            />
          </div>

          <div className="grid three">
            <div className="card">
              <h2>Subscription summary</h2>
              {Object.entries(s.subscriptions.byStatus).length === 0 ? (
                <p className="muted">No subscriptions yet.</p>
              ) : (
                Object.entries(s.subscriptions.byStatus).map(([status, count]) => (
                  <div key={status} className="bar-row">
                    <div className="bar-top">
                      <span>{status}</span>
                      <strong>{count}</strong>
                    </div>
                    <div className="bar">
                      <div
                        style={{
                          width: `${s.subscriptions.total
                            ? (count / s.subscriptions.total) * 100
                            : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
              <p style={{ marginTop: 14 }}>
                <Link to="/portal/subscriptions">View my subscriptions →</Link>
              </p>
            </div>

            <div className="card">
              <h2>Invoice summary</h2>
              {Object.entries(s.invoices.byStatus).length === 0 ? (
                <p className="muted">No invoices yet.</p>
              ) : (
                Object.entries(s.invoices.byStatus).map(([status, count]) => (
                  <div key={status} className="bar-row">
                    <div className="bar-top">
                      <span>{status}</span>
                      <strong>{count}</strong>
                    </div>
                    <div className="bar">
                      <div
                        style={{
                          width: `${s.invoices.invoiced
                            ? (count / Math.max(1, Object.values(s.invoices.byStatus)
                                .reduce((a, b) => a + b, 0))) * 100
                            : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
              <p style={{ marginTop: 14 }}>
                <Link to="/portal/invoices">View my invoices →</Link>
              </p>
            </div>

            <div className="card">
              <h2>Payment summary</h2>
              <div className="bar-row">
                <div className="bar-top">
                  <span>Total payments</span>
                  <strong>{s.revenue.payments}</strong>
                </div>
                <div className="bar">
                  <div style={{ width: s.revenue.payments ? '100%' : '0%' }} />
                </div>
              </div>
              <h2 style={{ marginTop: 16 }}>{money(s.revenue.collected)}</h2>
              <p className="muted">Total amount paid</p>
              <p style={{ marginTop: 14 }}>
                <Link to="/portal/payments">View payment history →</Link>
              </p>
            </div>
          </div>
        </>
      )}

      <div className="card" style={{ padding: 0, marginBottom: 16 }}>
        <div className="card-head">
          <h2>Recent subscriptions</h2>
          <Link to="/portal/subscriptions">View all</Link>
        </div>

        {subscriptions.error && <div className="error">{subscriptions.error}</div>}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Subscription</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Start date</th>
                <th>Expiry date</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.data?.items.map(sub => (
                <tr key={sub._id}>
                  <td>{sub.number}</td>
                  <td>{sub.plan?.name || '-'}</td>
                  <td>
                    <StatusBadge status={sub.status} />
                    {sub.paused && <span className="badge Quotation">Paused</span>}
                  </td>
                  <td>{date(sub.startDate)}</td>
                  <td>{date(sub.expiryDate)}</td>
                  <td>{money(sub.total)}</td>
                </tr>
              ))}

              {subscriptions.loading && !subscriptions.data && (
                <tr><td colSpan="6" className="muted">Loading...</td></tr>
              )}

              {subscriptions.data && !subscriptions.data.items.length && (
                <tr><td colSpan="6" className="muted">No subscriptions found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ padding: 0, marginBottom: 16 }}>
        <div className="card-head">
          <h2>Recent invoices</h2>
          <Link to="/portal/invoices">View all</Link>
        </div>

        {invoices.error && <div className="error">{invoices.error}</div>}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Invoice date</th>
                <th>Due date</th>
                <th>Status</th>
                <th>Total</th>
                <th>Balance</th>
              </tr>
            </thead>
            <tbody>
              {invoices.data?.items.map(inv => (
                <tr key={inv._id}>
                  <td>{inv.number}</td>
                  <td>{date(inv.invoiceDate)}</td>
                  <td>{date(inv.dueDate)}</td>
                  <td><StatusBadge status={invoiceState(inv)} /></td>
                  <td>{money(inv.total)}</td>
                  <td>
                    {inv.status === 'Cancelled'
                      ? '-'
                      : money(Math.max(0, inv.total - inv.amountPaid))}
                  </td>
                </tr>
              ))}

              {invoices.loading && !invoices.data && (
                <tr><td colSpan="6" className="muted">Loading...</td></tr>
              )}

              {invoices.data && !invoices.data.items.length && (
                <tr><td colSpan="6" className="muted">No invoices found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="card-head">
          <h2>Recent payments</h2>
          <Link to="/portal/payments">View all</Link>
        </div>

        {payments.error && <div className="error">{payments.error}</div>}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Invoice</th>
                <th>Method</th>
                <th>Amount</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {payments.data?.items.map(payment => (
                <tr key={payment._id}>
                  <td>{date(payment.date)}</td>
                  <td>{payment.invoiceNumber || '-'}</td>
                  <td style={{ textTransform: 'capitalize' }}>
                    {(payment.method || '-').replace('_', ' ')}
                  </td>
                  <td><strong>{money(payment.amount)}</strong></td>
                  <td className="muted">{payment.note || '-'}</td>
                </tr>
              ))}

              {payments.loading && !payments.data && (
                <tr><td colSpan="5" className="muted">Loading...</td></tr>
              )}

              {payments.data && !payments.data.items.length && (
                <tr><td colSpan="5" className="muted">No payments found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
