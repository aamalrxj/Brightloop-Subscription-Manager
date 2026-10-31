
import { useState } from 'react';
import api from '../api';
import { useFetch } from '../hooks/useFetch';
import Modal from '../components/Modal';
import { isoDay, money, date } from '../utils/format';

export default function RunBillingModal({ onClose, onDone }) {
  const subscriptions = useFetch(
    () => api.get('/subscriptions', {
      params: { status: 'Active', limit: 50 },
    }),
    []
  );

  const [subscriptionId, setSubscriptionId] = useState('');
  const [day, setDay] = useState(isoDay(new Date()));
  const [autoConfirm, setAutoConfirm] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const eligibleSubscriptions = (subscriptions.data?.items || [])
    .filter(subscription => !subscription.paused);

  const selectedSubscription = eligibleSubscriptions.find(
    subscription => subscription._id === subscriptionId
  );

  const run = async () => {
    if (!subscriptionId) {
      setError('Select an active subscription.');
      return;
    }

    if (!day) {
      setError('Select a billing date.');
      return;
    }

    setBusy(true);
    setError('');

    try {
      const response = await api.post('/billing/run', {
        date: day,
        autoConfirm,
        subscription: subscriptionId,
      });

      setResult(response);
      onDone();
    } catch (e) {
      setError(e.message || 'Billing failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Run billing" onClose={onClose}>
      {!result ? (
        <>
          <p className="muted">
            Generate an invoice for one selected active subscription.
            Other subscriptions will not be billed.
          </p>

          {subscriptions.error && (
            <div className="error">{subscriptions.error}</div>
          )}

          <label>
            Select subscription *
            <select
              value={subscriptionId}
              onChange={e => setSubscriptionId(e.target.value)}
              required
            >
              <option value="">Choose a subscription</option>

              {eligibleSubscriptions.map(subscription => (
                <option
                  key={subscription._id}
                  value={subscription._id}
                >
                  {subscription.number} - {subscription.customer?.name}
                  {' - '}
                  {subscription.plan?.name}
                </option>
              ))}
            </select>
          </label>

          {subscriptions.data && eligibleSubscriptions.length === 0 && (
            <p className="hint">
              No unpaused active subscriptions are available.
            </p>
          )}

          {selectedSubscription && (
            <div className="card preview">
              <strong>{selectedSubscription.number}</strong>
              <div className="muted">
                {selectedSubscription.customer?.name}
              </div>
              <div className="muted">
                {selectedSubscription.plan?.name}
              </div>
              <div className="muted">
                Next billing date: {date(selectedSubscription.nextBillingDate)}
              </div>
              <div>
                Subscription total: {money(selectedSubscription.total)}
              </div>
            </div>
          )}

          <label>
            Bill as of
            <input
              type="date"
              value={day}
              onChange={e => setDay(e.target.value)}
            />
          </label>

          <label className="check">
            <input
              type="checkbox"
              checked={autoConfirm}
              onChange={e => setAutoConfirm(e.target.checked)}
            />
            Confirm invoice automatically
          </label>

          <p className="hint">
            For testing, leave automatic confirmation unchecked so you can
            inspect the generated draft invoice first.
          </p>

          {error && <div className="error">{error}</div>}

          <button
            className="btn primary block"
            disabled={
              busy ||
              subscriptions.loading ||
              !subscriptionId ||
              !day
            }
            onClick={run}
          >
            {busy ? 'Billing...' : 'Generate invoice'}
          </button>
        </>
      ) : (
        <>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
            <div className="card stat">
              <div className="label">Invoices created</div>
              <div className="value" style={{ color: 'var(--ok)' }}>
                {result.created}
              </div>
            </div>

            <div className="card stat">
              <div className="label">Already billed</div>
              <div className="value">{result.skipped}</div>
            </div>

            <div className="card stat">
              <div className="label">Failed</div>
              <div className="value" style={{
                color: result.failed ? 'var(--bad)' : undefined,
              }}>
                {result.failed}
              </div>
            </div>

            <div className="card stat">
              <div className="label">Auto-closed</div>
              <div className="value">{result.closed}</div>
            </div>
          </div>

          {result.errors?.map((item, index) => (
            <div className="error" key={index}>
              {item.subscription}: {item.message}
            </div>
          ))}

          <button className="btn block" onClick={onClose}>
            Done
          </button>
        </>
      )}
    </Modal>
  );
}
