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
  type: '',
  salesPrice: '',
  costPrice: '',
  tax: '',
  notes: '',
  variants: [],
};

function ProductModal({ product, taxes, onClose, onSaved }) {
  const [form, setForm] = useState(() => product ? {
    name: product.name || '',
    type: product.type || '',
    salesPrice: String(product.salesPrice ?? ''),
    costPrice: String(product.costPrice ?? ''),
    tax: product.tax?._id || product.tax || '',
    notes: product.notes || '',
    variants: (product.variants || []).map(v => ({
      attribute: v.attribute || '',
      value: v.value || '',
      extraPrice: String(v.extraPrice ?? 0),
    })),
  } : { ...EMPTY_FORM });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const update = (key, value) => {
    setForm(current => ({ ...current, [key]: value }));
  };

  const updateVariant = (index, key, value) => {
    setForm(current => ({
      ...current,
      variants: current.variants.map((variant, i) =>
        i === index ? { ...variant, [key]: value } : variant
      ),
    }));
  };

  const addVariant = () => {
    setForm(current => ({
      ...current,
      variants: [
        ...current.variants,
        { attribute: '', value: '', extraPrice: '0' },
      ],
    }));
  };

  const removeVariant = index => {
    setForm(current => ({
      ...current,
      variants: current.variants.filter((_, i) => i !== index),
    }));
  };

  const submit = async e => {
    e.preventDefault();
    setError('');

    if (!form.name.trim() || !form.type.trim()) {
      setError('Product name and type are required.');
      return;
    }

    if (
      form.salesPrice === '' ||
      form.costPrice === '' ||
      Number(form.salesPrice) < 0 ||
      Number(form.costPrice) < 0
    ) {
      setError('Enter valid sales and cost prices.');
      return;
    }

    const hasIncompleteVariant = form.variants.some(v =>
      !v.attribute.trim() || !v.value.trim() ||
      v.extraPrice === '' || Number(v.extraPrice) < 0
    );

    if (hasIncompleteVariant) {
      setError('Complete or remove every variant before saving.');
      return;
    }

    const payload = {
      name: form.name.trim(),
      type: form.type.trim(),
      salesPrice: Number(form.salesPrice),
      costPrice: Number(form.costPrice),
      notes: form.notes.trim(),
      tax: form.tax || undefined,
      variants: form.variants.map(v => ({
        attribute: v.attribute.trim(),
        value: v.value.trim(),
        extraPrice: Number(v.extraPrice),
      })),
    };

    try {
      setSaving(true);

      if (product) {
        await api.patch(`/products/${product._id}`, payload);
      } else {
        await api.post('/products', payload);
      }

      onSaved();
    } catch (err) {
      setError(err.message || 'Could not save product.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={product ? 'Edit product' : 'Create product'}
      onClose={onClose}
      wide
    >
      <form onSubmit={submit}>
        {error && <div className="error">{error}</div>}

        <div className="two">
          <label>
            Product name *
            <input
              value={form.name}
              onChange={e => update('name', e.target.value)}
              placeholder="e.g. Accounting Software"
              required
            />
          </label>

          <label>
            Product type *
            <input
              value={form.type}
              onChange={e => update('type', e.target.value)}
              placeholder="e.g. Software, Service, Hardware"
              required
            />
          </label>
        </div>

        <div className="two">
          <label>
            Sales price (₹) *
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.salesPrice}
              onChange={e => update('salesPrice', e.target.value)}
              placeholder="0.00"
              required
            />
          </label>

          <label>
            Cost price (₹) *
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.costPrice}
              onChange={e => update('costPrice', e.target.value)}
              placeholder="0.00"
              required
            />
          </label>
        </div>

        <label>
          Default tax
          <select
            value={form.tax}
            onChange={e => update('tax', e.target.value)}
          >
            <option value="">No default tax</option>
            {taxes.map(tax => (
              <option key={tax._id} value={tax._id}>
                {tax.name} ({tax.rate}%)
              </option>
            ))}
          </select>
        </label>

        <label>
          Notes
          <textarea
            rows="3"
            value={form.notes}
            onChange={e => update('notes', e.target.value)}
            placeholder="Additional product information..."
          />
        </label>

        <div style={{ marginTop: 18, marginBottom: 12 }}>
          <div className="page-head">
            <h2 style={{ fontSize: 16 }}>Product variants</h2>
            <button
              type="button"
              className="btn small"
              onClick={addVariant}
            >
              + Add variant
            </button>
          </div>

          <p className="hint">
            Optional. For example, Attribute: Brand, Value: Odoo,
            Extra price: 500.
          </p>

          {form.variants.map((variant, index) => (
            <div className="line-row" key={index}>
              <input
                aria-label="Variant attribute"
                placeholder="Attribute"
                value={variant.attribute}
                onChange={e =>
                  updateVariant(index, 'attribute', e.target.value)
                }
              />

              <input
                aria-label="Variant value"
                placeholder="Value"
                value={variant.value}
                onChange={e =>
                  updateVariant(index, 'value', e.target.value)
                }
              />

              <input
                aria-label="Variant extra price"
                type="number"
                min="0"
                step="0.01"
                placeholder="Extra ₹"
                value={variant.extraPrice}
                onChange={e =>
                  updateVariant(index, 'extraPrice', e.target.value)
                }
              />

              <button
                type="button"
                className="btn danger small"
                onClick={() => removeVariant(index)}
              >
                Remove
              </button>
            </div>
          ))}

          {form.variants.length === 0 && (
            <p className="hint">No variants added.</p>
          )}
        </div>

        <div className="actions" style={{ justifyContent: 'flex-end' }}>
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
            {saving ? 'Saving...' : product ? 'Save changes' : 'Create product'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function Products() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [active, setActive] = useState('');
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [actionError, setActionError] = useState('');
  const [message, setMessage] = useState('');

  const dq = useDebounce(q);

  const {
    data,
    error,
    loading,
    reload,
  } = useFetch(
    () => api.get('/products', {
      params: {
        page,
        limit: 20,
        q: dq || undefined,
        active: active === '' ? undefined : active,
      },
    }),
    [page, dq, active]
  );

  const { data: taxData, error: taxError } = useFetch(
    () => api.get('/taxes', {
      params: { limit: 50, active: true },
    }),
    []
  );

  const taxes = taxData?.items || [];

  const changeFilter = setter => value => {
    setter(value);
    setPage(1);
    setMessage('');
    setActionError('');
  };

  const saved = () => {
    setCreating(false);
    setEditing(null);
    setMessage('Product saved successfully.');
    setActionError('');
    reload();
  };

  const archiveProduct = async product => {
    const confirmed = window.confirm(
      `Archive "${product.name}"? It will no longer be available as an active product.`
    );

    if (!confirmed) return;

    setActionError('');
    setMessage('');

    try {
      await api.delete(`/products/${product._id}`);
      setMessage('Product archived successfully.');
      reload();
    } catch (err) {
      setActionError(err.message || 'Could not archive product.');
    }
  };

  return (
    <div>
      <PageHeader title="Products">
        <button
          className="btn primary"
          onClick={() => {
            setActionError('');
            setMessage('');
            setCreating(true);
          }}
        >
          + New product
        </button>
      </PageHeader>

      <div className="card filters">
        <label>
          Search products
          <input
            value={q}
            onChange={e => changeFilter(setQ)(e.target.value)}
            placeholder="Search by product name..."
          />
        </label>

        <label>
          Status
          <select
            value={active}
            onChange={e => changeFilter(setActive)(e.target.value)}
          >
            <option value="">All products</option>
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
      {taxError && (
        <div className="hint">
          Tax options could not be loaded. You can still create a product
          without a default tax.
        </div>
      )}
      {actionError && <div className="error">{actionError}</div>}
      {message && <div className="success">{message}</div>}

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Type</th>
                <th>Sales price</th>
                <th>Cost price</th>
                <th>Tax</th>
                <th>Variants</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {data?.items.map(product => (
                <tr key={product._id}>
                  <td>
                    <strong>{product.name}</strong>
                    {product.notes && (
                      <div className="hint">{product.notes}</div>
                    )}
                  </td>

                  <td>{product.type}</td>
                  <td>{money(product.salesPrice)}</td>
                  <td>{money(product.costPrice)}</td>

                  <td>
                    {product.tax
                      ? `${product.tax.name} (${product.tax.rate}%)`
                      : '-'}
                  </td>

                  <td>{product.variants?.length || 0}</td>

                  <td>
                    <span className={`badge ${product.active ? 'Active' : 'Closed'}`}>
                      {product.active ? 'Active' : 'Archived'}
                    </span>
                  </td>

                  <td>{date(product.createdAt)}</td>

                  <td>
                    <div className="actions">
                      <button
                        className="btn small"
                        onClick={() => {
                          setActionError('');
                          setMessage('');
                          setEditing(product);
                        }}
                      >
                        Edit
                      </button>

                      {product.active && (
                        <button
                          className="btn danger small"
                          onClick={() => archiveProduct(product)}
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
                  <td colSpan="9" className="muted">Loading products...</td>
                </tr>
              )}

              {data && data.items.length === 0 && (
                <tr>
                  <td colSpan="9" className="muted">
                    No products found.
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
        <ProductModal
          product={editing}
          taxes={taxes}
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