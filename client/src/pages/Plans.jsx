import { useState } from 'react';
import api from '../api';
import { useFetch } from '../hooks/useFetch';
import { useDebounce } from '../hooks/useDebounce';
import PageHeader from '../components/PageHeader';
import Pagination from '../components/Pagination';
import Modal from '../components/Modal';
import { money, date } from '../utils/format';

const EMPTY_FORM = {
  name: '',
  price: '',
  period: 'monthly',
  minQty: '1',
  availableFrom: new Date().toISOString().slice(0, 10),
  availableTo: '',
  autoClose: false,
  closable: false,
  pausable: false,
  renewable: true,
};

function PlanModal({ plan, onClose, onSaved }) {
  const [form, setForm] = useState(() => plan ? {
    name: plan.name || '',
    price: String(plan.price ?? ''),
    period: plan.period || 'monthly',
    minQty: String(plan.minQty ?? 1),
    availableFrom: plan.availableFrom
      ? new Date(plan.availableFrom).toISOString().slice(0, 10) : '',
    availableTo: plan.availableTo
      ? new Date(plan.availableTo).toISOString().slice(0, 10) : '',
    autoClose: Boolean(plan.autoClose),
    closable: Boolean(plan.closable),
    pausable: Boolean(plan.pausable),
    renewable: Boolean(plan.renewable),
  } : { ...EMPTY_FORM });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const update = (key, value) => {
    setForm(current => ({ ...current, [key]: value }));
  };

  const submit = async e => {
    e.preventDefault();
    setError('');

    if (!form.name.trim()) {
      setError('Plan name is required.');
      return;
    }

    if (form.price === '' || Number(form.price) < 0) {
      setError('Enter a valid plan price.');
      return;
    }

    if (!form.minQty || !Number.isInteger(Number(form.minQty)) ||
        Number(form.minQty) < 1) {
      setError('Minimum quantity must be at least 1.');
      return;
    }

    if (!form.availableFrom || !form.availableTo) {
      setError('Both availability dates are required.');
      return;
    }

    if (form.availableTo < form.availableFrom) {
      setError('Available-to date must be after the available-from date.');
      return;
    }

    const payload = {
      name: form.name.trim(),
      price: Number(form.price),
      period: form.period,
      minQty: Number(form.minQty),
      availableFrom: form.availableFrom,
      availableTo: form.availableTo,
      autoClose: form.autoClose,
      closable: form.closable,
      pausable: form.pausable,
      renewable: form.renewable,
    };

    try {
      setSaving(true);

      if (plan) {
        await api.patch(`/plans/${plan._id}`, payload);
      } else {
        await api.post('/plans', payload);
      }

      onSaved();
    } catch (err) {
      setError(err.message || 'Could not save plan.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={plan ? 'Edit plan' : 'Create plan'}
      onClose={onClose}
    >
      <form onSubmit={submit}>
        {error && <div className="error">{error}</div>}

        <label>
          Plan name *
          <input
            value={form.name}
            onChange={e => update('name', e.target.value)}
            placeholder="e.g. Professional Monthly"
            required
          />
        </label>

        <div className="two">
          <label>
            Price (₹) *
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={e => update('price', e.target.value)}
              placeholder="0.00"
              required
            />
          </label>

          <label>
            Billing period *
            <select
              value={form.period}
              onChange={e => update('period', e.target.value)}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </label>
        </div>

        <label>
          Minimum quantity *
          <input
            type="number"
            min="1"
            step="1"
            value={form.minQty}
            onChange={e => update('minQty', e.target.value)}
            required
          />
          <span className="hint">
            Minimum quantity required when selecting this plan.
          </span>
        </label>

        <div className="two">
          <label>
            Available from *
            <input
              type="date"
              value={form.availableFrom}
              onChange={e => update('availableFrom', e.target.value)}
              required
            />
          </label>

          <label>
            Available to *
            <input
              type="date"
              min={form.availableFrom || undefined}
              value={form.availableTo}
              onChange={e => update('availableTo', e.target.value)}
              required
            />
          </label>
        </div>

        <div style={{ marginTop: 12 }}>
          <strong>Plan settings</strong>
          <p className="hint">
            Configure how subscriptions using this plan behave.
          </p>

          <label className="check">
            <input
              type="checkbox"
              checked={form.autoClose}
              onChange={e => update('autoClose', e.target.checked)}
            />
            Automatically close when the plan ends
          </label>

          <label className="check">
            <input
              type="checkbox"
              checked={form.closable}
              onChange={e => update('closable', e.target.checked)}
            />
            Allow customers to close subscriptions early
          </label>

          <label className="check">
            <input
              type="checkbox"
              checked={form.pausable}
              onChange={e => update('pausable', e.target.checked)}
            />
            Allow subscriptions to be paused
          </label>

          <label className="check">
            <input
              type="checkbox"
              checked={form.renewable}
              onChange={e => update('renewable', e.target.checked)}
            />
            Allow subscription renewal
          </label>
        </div>

        <div
          className="actions"
          style={{ justifyContent: 'flex-end', marginTop: 18 }}
        >
          <button
            type="button"
            className="btn"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="btn primary"
            disabled={saving}
          >
            {saving ? 'Saving...' : plan ? 'Save changes' : 'Create plan'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function Plans() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [active, setActive] = useState('');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [message, setMessage] = useState('');
  const [actionError, setActionError] = useState('');

  const dq = useDebounce(q);

  const { data, error, loading, reload } = useFetch(
    () => api.get('/plans', {
      params: {
        page,
        limit: 20,
        q: dq || undefined,
        active: active === '' ? undefined : active,
      },
    }),
    [page, dq, active]
  );

  const changeFilter = setter => value => {
    setter(value);
    setPage(1);
    setMessage('');
    setActionError('');
  };

  const saved = () => {
    setCreating(false);
    setEditing(null);
    setMessage('Plan saved successfully.');
    setActionError('');
    reload();
  };

  const archivePlan = async plan => {
    const confirmed = window.confirm(
      `Archive "${plan.name}"?`
    );

    if (!confirmed) return;

    setMessage('');
    setActionError('');

    try {
      await api.delete(`/plans/${plan._id}`);
      setMessage('Plan archived successfully.');
      reload();
    } catch (err) {
      setActionError(err.message || 'Could not archive plan.');
    }
  };

  return (
    <div>
      <PageHeader title="Plans">
        <button
          className="btn primary"
          onClick={() => {
            setMessage('');
            setActionError('');
            setCreating(true);
          }}
        >
          + New plan
        </button>
      </PageHeader>

      <div className="card filters">
        <label>
          Search plans
          <input
            value={q}
            onChange={e => changeFilter(setQ)(e.target.value)}
            placeholder="Search by plan name..."
          />
        </label>

        <label>
          Status
          <select
            value={active}
            onChange={e => changeFilter(setActive)(e.target.value)}
          >
            <option value="">All plans</option>
            <option value="true">Active</option>
            <option value="false">Archived</option>
          </select>
        </label>

        <button
          className="btn"
          onClick={() => {
            setQ('');
            setActive('');
            setPage(1);
            setMessage('');
            setActionError('');
          }}
        >
          Clear filters
        </button>

        <button className="btn" onClick={reload}>
          Refresh
        </button>
      </div>

      {error && <div className="error">{error}</div>}
      {actionError && <div className="error">{actionError}</div>}
      {message && <div className="success">{message}</div>}

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Plan</th>
                <th>Price</th>
                <th>Period</th>
                <th>Min. quantity</th>
                <th>Available from</th>
                <th>Available to</th>
                <th>Settings</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {data?.items.map(plan => (
                <tr key={plan._id}>
                  <td><strong>{plan.name}</strong></td>
                  <td>{money(plan.price)}</td>
                  <td style={{ textTransform: 'capitalize' }}>
                    {plan.period}
                  </td>
                  <td>{plan.minQty || 1}</td>
                  <td>{date(plan.availableFrom)}</td>
                  <td>{date(plan.availableTo)}</td>

                  <td>
                    <div className="chips">
                      {plan.autoClose && <span className="badge">Auto-close</span>}
                      {plan.closable && <span className="badge">Closable</span>}
                      {plan.pausable && <span className="badge">Pausable</span>}
                      {plan.renewable && <span className="badge">Renewable</span>}
                      {!plan.autoClose && !plan.closable &&
                        !plan.pausable && !plan.renewable && '-'}
                    </div>
                  </td>

                  <td>
                    <span className={`badge ${plan.active ? 'Active' : 'Closed'}`}>
                      {plan.active ? 'Active' : 'Archived'}
                    </span>
                  </td>

                  <td>
                    <div className="actions">
                      <button
                        className="btn small"
                        onClick={() => {
                          setMessage('');
                          setActionError('');
                          setEditing(plan);
                        }}
                      >
                        Edit
                      </button>

                      {plan.active && (
                        <button
                          className="btn danger small"
                          onClick={() => archivePlan(plan)}
                        >
                          Archive
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {loading && !data && (
                <tr>
                  <td colSpan="9" className="muted">
                    Loading plans...
                  </td>
                </tr>
              )}

              {data && data.items.length === 0 && (
                <tr>
                  <td colSpan="9" className="muted">
                    No plans found.
                  </td>
                </tr>
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

      {(creating || editing) && (
        <PlanModal
          plan={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={saved}
        />
      )}
    </div>
  );
}