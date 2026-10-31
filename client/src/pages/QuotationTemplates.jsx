
import { useCallback, useEffect, useState } from 'react';
import api from '../api';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import { useDebounce } from '../hooks/useDebounce';

function getId(value) {
  return typeof value === 'string' ? value : value?._id || '';
}

function TemplateModal({ template, onClose, onSaved }) {
  const [name, setName] = useState(template?.name || '');
  const [plan, setPlan] = useState(getId(template?.plan));
  const [validityDays, setValidityDays] = useState(template?.validityDays ?? 30);
  const [lines, setLines] = useState(
    template?.lines?.map(line => ({
      product: getId(line.product),
      variant: getId(line.variant),
      qty: line.qty || 1,
    })) || [{ product: '', variant: '', qty: 1 }]
  );

  const [plans, setPlans] = useState([]);
  const [products, setProducts] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadOptions() {
      try {
        setLoadingOptions(true);

        const [planResult, productResult] = await Promise.all([
          api.get('/plans', { params: { active: true, limit: 50 } }),
          api.get('/products', { params: { active: true, limit: 50 } }),
        ]);

        if (mounted) {
          setPlans(planResult.items || []);
          setProducts(productResult.items || []);
        }
      } catch (err) {
        if (mounted) {
          setError(err.message || 'Unable to load plans and products.');
        }
      } finally {
        if (mounted) setLoadingOptions(false);
      }
    }

    loadOptions();

    return () => {
      mounted = false;
    };
  }, []);

  function updateLine(index, field, value) {
    setLines(current =>
      current.map((line, i) =>
        i === index
          ? {
              ...line,
              [field]: value,
              ...(field === 'product' ? { variant: '' } : {}),
            }
          : line
      )
    );
  }

  function addLine() {
    setLines(current => [
      ...current,
      { product: '', variant: '', qty: 1 },
    ]);
  }

  function removeLine(index) {
    setLines(current => current.filter((_, i) => i !== index));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Template name is required.');
      return;
    }

    if (!plan) {
      setError('Please select a subscription plan.');
      return;
    }

    const days = Number(validityDays);

    if (!Number.isInteger(days) || days < 1) {
      setError('Validity must be at least one day.');
      return;
    }

    if (!lines.length || lines.some(line => !line.product)) {
      setError('Please select a product for every quotation line.');
      return;
    }

    if (lines.some(line => !Number.isInteger(Number(line.qty)) || Number(line.qty) < 1)) {
      setError('Product quantities must be whole numbers greater than zero.');
      return;
    }

    const payload = {
      name: name.trim(),
      plan,
      validityDays: days,
      lines: lines.map(line => ({
        product: line.product,
        ...(line.variant ? { variant: line.variant } : {}),
        qty: Number(line.qty),
      })),
    };

    try {
      setSaving(true);

      if (template) {
        await api.patch(`/templates/${template._id}`, payload);
      } else {
        await api.post('/templates', payload);
      }

      onSaved();
    } catch (err) {
      setError(err.message || 'Unable to save quotation template.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={template ? 'Edit Quotation Template' : 'Create Quotation Template'}
      onClose={onClose}
      wide
    >
      {loadingOptions ? (
        <p className="muted">Loading plans and products...</p>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="two">
            <div>
              <label htmlFor="template-name">Template name</label>
              <input
                id="template-name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Standard Monthly Package"
                required
              />
            </div>

            <div>
              <label htmlFor="template-plan">Subscription plan</label>
              <select
                id="template-plan"
                value={plan}
                onChange={e => setPlan(e.target.value)}
                required
              >
                <option value="">Select a plan</option>
                {plans.map(item => (
                  <option key={item._id} value={item._id}>
                    {item.name} — ₹{Number(item.price).toLocaleString('en-IN')} / {item.period}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="template-validity">Quotation validity (days)</label>
              <input
                id="template-validity"
                type="number"
                min="1"
                step="1"
                value={validityDays}
                onChange={e => setValidityDays(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ marginTop: 20 }}>
            <div className="line-row">
              <h3>Quotation products</h3>
              <button
                type="button"
                className="btn"
                onClick={addLine}
              >
                + Add product
              </button>
            </div>

            {lines.map((line, index) => {
              const selectedProduct = products.find(
                item => item._id === line.product
              );

              return (
                <div
                  key={index}
                  className="card"
                  style={{ marginBottom: 12 }}
                >
                  <div className="two">
                    <div>
                      <label>Product</label>
                      <select
                        value={line.product}
                        onChange={e =>
                          updateLine(index, 'product', e.target.value)
                        }
                        required
                      >
                        <option value="">Select product</option>
                        {products.map(product => (
                          <option key={product._id} value={product._id}>
                            {product.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label>Variant (optional)</label>
                      <select
                        value={line.variant}
                        onChange={e =>
                          updateLine(index, 'variant', e.target.value)
                        }
                        disabled={!selectedProduct?.variants?.length}
                      >
                        <option value="">Default product</option>
                        {selectedProduct?.variants?.map(variant => (
                          <option key={variant._id} value={variant._id}>
                            {variant.attribute}: {variant.value}
                            {Number(variant.extraPrice)
                              ? ` (+₹${variant.extraPrice})`
                              : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label>Quantity</label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={line.qty}
                        onChange={e =>
                          updateLine(index, 'qty', e.target.value)
                        }
                        required
                      />
                    </div>
                  </div>

                  {lines.length > 1 && (
                    <div className="actions">
                      <button
                        type="button"
                        className="btn"
                        onClick={() => removeLine(index)}
                      >
                        Remove product
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {plans.length === 0 && (
            <p className="error">Create an active subscription plan first.</p>
          )}

          {products.length === 0 && (
            <p className="error">Create at least one active product first.</p>
          )}

          {error && <p className="error">{error}</p>}

          <div className="actions">
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
              disabled={saving || plans.length === 0 || products.length === 0}
            >
              {saving
                ? 'Saving...'
                : template
                  ? 'Update Template'
                  : 'Create Template'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

export default function QuotationTemplates() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('true');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const debouncedSearch = useDebounce(search, 350);

  const loadTemplates = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const params = { page, limit: 10 };

      if (debouncedSearch.trim()) {
        params.q = debouncedSearch.trim();
      }

      if (status !== 'all') {
        params.active = status;
      }

      const result = await api.get('/templates', { params });

      setItems(result.items || []);
      setTotal(result.total || 0);
      setPages(result.pages || 1);
    } catch (err) {
      setError(err.message || 'Unable to load quotation templates.');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, status]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  function openCreateModal() {
    setEditingTemplate(null);
    setShowModal(true);
  }

  function openEditModal(template) {
    setEditingTemplate(template);
    setShowModal(true);
  }

  async function archiveTemplate(template) {
    if (!window.confirm(`Archive "${template.name}"?`)) return;

    try {
      await api.delete(`/templates/${template._id}`);
      await loadTemplates();
    } catch (err) {
      setError(err.message || 'Unable to archive template.');
    }
  }

  function handleSaved() {
    setShowModal(false);
    setEditingTemplate(null);
    loadTemplates();
  }

  return (
    <>
      <PageHeader title="Quotation Templates">
        <button className="btn primary" onClick={openCreateModal}>
          + New Template
        </button>
      </PageHeader>

      <div className="filters">
        <input
          value={search}
          onChange={e => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search templates..."
        />

        <select
          value={status}
          onChange={e => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="true">Active</option>
          <option value="false">Archived</option>
          <option value="all">All templates</option>
        </select>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Template</th>
                <th>Subscription Plan</th>
                <th>Products</th>
                <th>Validity</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6">Loading templates...</td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan="6">No quotation templates found.</td>
                </tr>
              ) : (
                items.map(template => (
                  <tr key={template._id}>
                    <td>{template.name}</td>

                    <td>
                      {template.plan?.name || 'Plan unavailable'}
                    </td>

                    <td>
                      {template.lines?.length || 0} item(s)
                    </td>

                    <td>{template.validityDays || 30} days</td>

                    <td>
                      <span className={`badge ${template.active ? 'success' : ''}`}>
                        {template.active ? 'Active' : 'Archived'}
                      </span>
                    </td>

                    <td>
                      <div className="actions">
                        <button
                          className="btn"
                          onClick={() => openEditModal(template)}
                          disabled={!template.active}
                        >
                          Edit
                        </button>

                        {template.active && (
                          <button
                            className="btn"
                            onClick={() => archiveTemplate(template)}
                          >
                            Archive
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          page={page}
          pages={pages}
          total={total}
          onPage={setPage}
        />
      </div>

      {showModal && (
        <TemplateModal
          template={editingTemplate}
          onClose={() => setShowModal(false)}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}
