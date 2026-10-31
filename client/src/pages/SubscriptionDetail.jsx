
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
  const invs = useFetch(
    () => api.get('/invoices', {
      params: { subscription: id, limit: 20 },
    }),
    [id]
  );

  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const s = sub.data;

  if (sub.error) return <div className="error">{sub.error}</div>;
  if (!s) return <div className="card muted">Loading...</div>;

  const act = async (path, ask) => {
    if (ask && !window.confirm(ask)) return;

    setBusy(true);
    setError('');

    try {
      await api.post(`/subscriptions/${id}/${path}`);
      sub.reload();
      invs.reload();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const Btn = ({ path, label, ask, kind = '' }) => (
    <button
      className={`btn ${kind}`}
      disabled={busy}
      onClick={() => act(path, ask)}
    >
      {label}
    </button>
  );

  const p = s.plan;
  const cur = STEPS.indexOf(s.status);
  const isPackageSubscription = s.packagePrice != null;

  return (
    <div>
      <PageHeader title={s.number}>
        <Link to="/subscriptions" className="btn">Back</Link>

        {s.status === 'Draft' && (
          <>
            <Btn path="send" label="Send quotation" kind="primary" />
            <Btn
              path="close"
              label="Cancel"
              kind="danger"
              ask="Cancel this subscription?"
            />
          </>
        )}

        {s.status === 'Quotation' && (
          <>
            <Btn path="confirm" label="Confirm" kind="primary" />
            <Btn
              path="close"
              label="Cancel"
              kind="danger"
              ask="Cancel this subscription?"
            />
          </>
        )}

        {s.status === 'Confirmed' && (
          <>
            <Btn path="activate" label="Activate" kind="primary" />
            <Btn
              path="close"
              label="Cancel"
              kind="danger"
              ask="Cancel this subscription?"
            />
          </>
        )}

        {s.status === 'Active' && (
          <>
            {p?.pausable && (
              s.paused
                ? <Btn path="resume" label="Resume" kind="primary" />
                : <Btn path="pause" label="Pause" />
            )}

            {p?.renewable && (
              <Btn
                path="renew"
                label="Renew"
                ask="Extend the expiry date by one plan period?"
              />
            )}

            {p?.closable && (
              <Btn
                path="close"
                label="Close early"
                kind="danger"
                ask="Close this subscription? Billing will stop."
              />
            )}
          </>
        )}
      </PageHeader>

      {error && <div className="error">{error}</div>}

      <div className="card">
        <div className="stepper">
          {STEPS.map((step, index) => (
            <div
              key={step}
              className={`step ${index < cur ? 'done' : ''} ${index === cur ? 'current' : ''}`}
            >
              <span className="dot">
                {index < cur ? '✓' : index + 1}
              </span>
              {step}
            </div>
          ))}
        </div>

        <div className="info">
          <div>
            <span className="label">Status</span>
            <StatusBadge status={s.status} />
            {s.paused && (
              <span
                className="badge Quotation"
                style={{ marginLeft: 6 }}
              >
                Paused
              </span>
            )}
          </div>

          <div>
            <span className="label">Customer</span>
            {s.customer?.name}
            <div className="muted">{s.customer?.email}</div>
          </div>

          <div>
            <span className="label">Plan</span>
            {p?.name}
            <div className="muted">
              {p?.period}
              {isPackageSubscription
                ? `, package price ${money(s.packagePrice)}`
                : `, plan price ${money(p?.price || 0)}`}
            </div>
          </div>

          <div>
            <span className="label">Start date</span>
            {date(s.startDate)}
          </div>

          <div>
            <span className="label">Expiry date</span>
            {date(s.expiryDate)}
          </div>

          <div>
            <span className="label">Payment terms</span>
            {s.paymentTermDays ? `${s.paymentTermDays} days` : 'Due on receipt'}
          </div>

          {s.status === 'Quotation' && (
            <div>
              <span className="label">Quotation valid until</span>
              {date(s.quotationExpiry)}
            </div>
          )}

          {s.status === 'Active' && (
            <div>
              <span className="label">Next billing</span>
              {date(s.nextBillingDate)}
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ padding: 0, marginTop: 14 }}>
        <div className="card-head">
          <h2>{isPackageSubscription ? 'Included products' : 'Lines'}</h2>
        </div>

        {isPackageSubscription && (
          <p className="hint" style={{ padding: '0 16px' }}>
            These products are included in the subscription package.
            They are not charged separately.
          </p>
        )}

        <div className="table-wrap">
          <table>
            <thead>
              {isPackageSubscription ? (
                <tr>
                  <th>Included product</th>
                  <th>Quantity</th>
                  <th>Package billing</th>
                </tr>
              ) : (
                <tr>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Unit price</th>
                  <th>Tax</th>
                  <th>Amount</th>
                </tr>
              )}
            </thead>

            <tbody>
              {s.lines.map((line, index) => (
                <tr key={index}>
                  <td>
                    {line.name}
                    {line.variantLabel && (
                      <div className="muted">{line.variantLabel}</div>
                    )}
                  </td>

                  <td>{line.qty}</td>

                  {isPackageSubscription ? (
                    <td>Included</td>
                  ) : (
                    <>
                      <td>{money(line.unitPrice)}</td>
                      <td>
                        {line.taxName
                          ? `${line.taxName} (${line.taxRate}%)`
                          : '-'}
                      </td>
                      <td>{money(line.amount)}</td>
                    </>
                  )}
                </tr>
              ))}

              {s.lines.length === 0 && (
                <tr>
                  <td colSpan={isPackageSubscription ? 3 : 5} className="muted">
                    No products added.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="totals">
          {isPackageSubscription ? (
            <>
              <div>
                <span>Package price</span>
                <span>{money(s.packagePrice)}</span>
              </div>

              <div>
                <span>
                  Tax {s.taxName ? `(${s.taxName} - ${s.taxRate}%)` : ''}
                </span>
                <span>{money(s.taxTotal)}</span>
              </div>
            </>
          ) : (
            <>
              <div>
                <span>Subtotal</span>
                <span>{money(s.subtotal)}</span>
              </div>
              <div>
                <span>Tax</span>
                <span>{money(s.taxTotal)}</span>
              </div>
            </>
          )}

          <div className="grand">
            <span>Total per period</span>
            <span>{money(s.total)}</span>
          </div>

          <p className="muted" style={{ margin: '6px 0 0' }}>
            Discounts are applied automatically on each invoice.
          </p>
        </div>
      </div>

      <div className="card" style={{ padding: 0, marginTop: 14 }}>
        <div className="card-head">
          <h2>Invoices</h2>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Period</th>
                <th>Due</th>
                <th>State</th>
                <th>Total</th>
                <th>Balance</th>
              </tr>
            </thead>

            <tbody>
              {invs.data?.items.map(invoice => (
                <tr key={invoice._id}>
                  <td>
                    <Link to={`/invoices?q=${invoice.number}`}>
                      {invoice.number}
                    </Link>
                  </td>

                  <td>
                    {date(invoice.periodStart)} to {date(invoice.periodEnd)}
                  </td>

                  <td>{date(invoice.dueDate)}</td>
                  <td>
                    <StatusBadge status={invoiceState(invoice)} />
                  </td>
                  <td>{money(invoice.total)}</td>
                  <td>{money(invoice.total - invoice.amountPaid)}</td>
                </tr>
              ))}

              {invs.data && !invs.data.items.length && (
                <tr>
                  <td colSpan="6" className="muted">No invoices yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
