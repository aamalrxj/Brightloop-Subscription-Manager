
import { useState } from 'react';
import api from '../api';
import { useFetch } from '../hooks/useFetch';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import Pagination from '../components/Pagination';
import Modal from '../components/Modal';
import { money, date } from '../utils/format';

export default function PortalSubscriptions() {
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const { data, loading, error: listError, reload } = useFetch(
    () => api.get('/portal/subscriptions', { params: { page, limit: 20 } }),
    [page]
  );

  const openDetails = async sub => {
    setSelected(sub);
    setDetail(null);
    setError('');
    setMessage('');
    try {
      const result = await api.get(`/portal/subscriptions/${sub._id}`);
      setDetail(result);
    } catch (err) {
      setError(err.message);
    }
  };

  const performAction = async action => {
    if (!selected) return;

    const labels = {
      pause: 'pause this subscription',
      resume: 'resume this subscription',
      renew: 'renew this subscription',
      close: 'close this subscription',
    };

    if (!window.confirm(`Are you sure you want to ${labels[action]}?`)) return;

    setBusy(true);
    setError('');
    setMessage('');

    try {
      await api.post(`/portal/subscriptions/${selected._id}/${action}`);
      const refreshed = await api.get(`/portal/subscriptions/${selected._id}`);
      setDetail(refreshed);
      setDetail(result);
      setMessage(`Subscription ${action} request completed successfully.`);
      reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const plan = detail?.plan;

  return (
    <div>
      <PageHeader title="My subscriptions" />

      {listError && <div className="error">{listError}</div>}

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Subscription</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Start date</th>
                <th>Expiry date</th>
                <th>Next billing</th>
                <th>Total</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map(sub => (
                <tr key={sub._id}>
                  <td>{sub.number}</td>
                  <td>
                    {sub.plan?.name || '-'}
                    <span className="muted"> {sub.plan?.period || ''}</span>
                  </td>
                  <td>
                    <StatusBadge status={sub.status} />
                    {sub.paused && (
                      <span className="badge Quotation" style={{ marginLeft: 5 }}>
                        Paused
                      </span>
                    )}
                  </td>
                  <td>{date(sub.startDate)}</td>
                  <td>{date(sub.expiryDate)}</td>
                  <td>{sub.status === 'Active' ? date(sub.nextBillingDate) : '-'}</td>
                  <td>{money(sub.total)}</td>
                  <td>
                    <button className="btn small" onClick={() => openDetails(sub)}>
                      View
                    </button>
                  </td>
                </tr>
              ))}

              {loading && !data && (
                <tr><td colSpan="8" className="muted">Loading subscriptions...</td></tr>
              )}
              {data && !data.items.length && (
                <tr><td colSpan="8" className="muted">You don't have any subscriptions yet.</td></tr>
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

      {selected && (
        <Modal title={`Subscription ${selected.number}`} wide onClose={() => {
          setSelected(null);
          setDetail(null);
          setError('');
          setMessage('');
        }}>
          {error && <div className="error">{error}</div>}
          {message && <div className="success">{message}</div>}

          {!detail ? (
            <p className="muted">Loading subscription details...</p>
          ) : (
            <>
              <div className="info">
                <div>
                  <span className="label">Plan</span>
                  <strong>{plan?.name || '-'}</strong>
                </div>
                <div>
                  <span className="label">Status</span>
                  <StatusBadge status={detail.status} />
                  {detail.paused && <span className="badge Quotation">Paused</span>}
                </div>
                <div>
                  <span className="label">Start date</span>
                  {date(detail.startDate)}
                </div>
                <div>
                  <span className="label">Expiry date</span>
                  {date(detail.expiryDate)}
                </div>
                <div>
                  <span className="label">Next billing</span>
                  {date(detail.nextBillingDate)}
                </div>
                <div>
                  <span className="label">Total</span>
                  <strong>{money(detail.total)}</strong>
                </div>
              </div>

              <h3 style={{ marginTop: 22 }}>Subscription items</h3>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Product</th><th>Variant</th><th>Quantity</th><th>Unit price</th><th>Amount</th></tr>
                  </thead>
                  <tbody>
                    {detail.lines?.map((line, index) => (
                      <tr key={index}>
                        <td>{line.name || '-'}</td>
                        <td>{line.variantLabel || '-'}</td>
                        <td>{line.qty}</td>
                        <td>{money(line.unitPrice)}</td>
                        <td>{money(line.amount)}</td>
                      </tr>
                    ))}
                    {!detail.lines?.length && (
                      <tr><td colSpan="5" className="muted">No items available.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: 18 }}>
                <strong>Manage subscription</strong>
                <p className="hint">
                  Available actions depend on your subscription status and plan settings.
                </p>
                <div className="actions" style={{ flexWrap: 'wrap' }}>
                  {}
                  <button
                    className="btn"
                    disabled={busy || detail.status !== 'Active' || !plan?.pausable || detail.paused}
                    onClick={() => performAction('pause')}
                  >
                    Pause
                  </button>
                  <button
                    className="btn"
                    disabled={busy || detail.status !== 'Active' || !detail.paused}
                    onClick={() => performAction('resume')}
                  >
                    Resume
                  </button>
                  <button
                    className="btn"
                    disabled={busy || detail.status !== 'Active' || !plan?.renewable}
                    onClick={() => performAction('renew')}
                  >
                    Renew
                  </button>
                  <button
                    className="btn danger"
                    disabled={busy || detail.status !== 'Active' || !plan?.closable}
                    onClick={() => performAction('close')}
                  >
                    Close subscription
                  </button>
                </div>
              </div>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}
