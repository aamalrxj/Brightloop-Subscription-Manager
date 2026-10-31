
import { useCallback, useEffect, useState } from 'react';
import api from '../api';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import { useDebounce } from '../hooks/useDebounce';

function dateInput(value) {
  if (!value) return '';
  const d = new Date(value);
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10);
}

function DiscountModal({ discount, onClose, onSaved }) {
  const [name, setName] = useState(discount?.name || '');
  const [type, setType] = useState(discount?.type || 'percent');
  const [value, setValue] = useState(discount?.value ?? '');
  const [minPurchase, setMinPurchase] = useState(discount?.minPurchase ?? 0);
  const [minQty, setMinQty] = useState(discount?.minQty ?? 0);
  const [startDate, setStartDate] = useState(dateInput(discount?.startDate));
  const [endDate, setEndDate] = useState(dateInput(discount?.endDate));
  const [usageLimit, setUsageLimit] = useState(discount?.usageLimit ?? '');
  const [appliesTo, setAppliesTo] = useState(discount?.appliesTo || 'subscription');
  const [products, setProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState(
    (discount?.products || []).map(p => typeof p === 'string' ? p : p._id)
  );
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadProducts() {
      try {
        setLoadingProducts(true);
        const result = await api.get('/products', {
          params: { active: true, limit: 50 },
        });

        if (mounted) setProducts(result.items || []);
      } catch (err) {
        if (mounted) setError(err.message || 'Unable to load products.');
      } finally {
        if (mounted) setLoadingProducts(false);
      }
    }

    loadProducts();

    return () => {
      mounted = false;
    };
  }, []);

  function toggleProduct(id) {
    setSelectedProducts(current =>
      current.includes(id)
        ? current.filter(item => item !== id)
        : [...current, id]
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const numericValue = Number(value);
    const numericMinPurchase = Number(minPurchase);
    const numericMinQty = Number(minQty);
    const numericUsageLimit = usageLimit === '' ? null : Number(usageLimit);

    if (!name.trim()) {
      setError('Discount name is required.');
      return;
    }

    if (value === '' || !Number.isFinite(numericValue) || numericValue < 0) {
      setError('Enter a valid discount value.');
      return;
    }

    if (type === 'percent' && numericValue > 100) {
      setError('Percentage discount cannot exceed 100%.');
      return;
    }

    if (!startDate || !endDate || endDate < startDate) {
      setError('Please select valid dates. End date must be on or after start date.');
      return;
    }

    if (numericMinPurchase < 0 || numericMinQty < 0) {
      setError('Minimum purchase and quantity cannot be negative.');
      return;
    }

    if (
      numericUsageLimit !== null &&
      (!Number.isInteger(numericUsageLimit) || numericUsageLimit < 1)
    ) {
      setError('Usage limit must be a whole number greater than zero.');
      return;
    }

    if (appliesTo === 'product' && selectedProducts.length === 0) {
      setError('Select at least one product for a product discount.');
      return;
    }

    const payload = {
      name: name.trim(),
      type,
      value: numericValue,
      minPurchase: numericMinPurchase,
      minQty: numericMinQty,
      startDate,
      endDate,
      usageLimit: numericUsageLimit,
      appliesTo,
      products: appliesTo === 'product' ? selectedProducts : [],
    };

    try {
      setSaving(true);

      if (discount) {
        await api.patch(`/discounts/${discount._id}`, payload);
      } else {
        await api.post('/discounts', payload);
      }

      onSaved();
    } catch (err) {
      setError(err.message || 'Unable to save discount.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={discount ? 'Edit Discount' : 'Create Discount'}
      onClose={onClose}
      wide
    >
      <form onSubmit={handleSubmit}>
        <div className="two">
          <div>
            <label htmlFor="discount-name">Discount name</label>
            <input
              id="discount-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Festive Offer"
              required
            />
          </div>

          <div>
            <label htmlFor="discount-type">Discount type</label>
            <select
              id="discount-type"
              value={type}
              onChange={e => setType(e.target.value)}
            >
              <option value="percent">Percentage (%)</option>
              <option value="fixed">Fixed amount (₹)</option>
            </select>
          </div>

          <div>
            <label htmlFor="discount-value">
              Discount value {type === 'percent' ? '(%)' : '(₹)'}
            </label>
            <input
              id="discount-value"
              type="number"
              min="0"
              max={type === 'percent' ? 100 : undefined}
              step="0.01"
              value={value}
              onChange={e => setValue(e.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="discount-applies">Applies to</label>
            <select
              id="discount-applies"
              value={appliesTo}
              onChange={e => setAppliesTo(e.target.value)}
            >
              <option value="subscription">Subscriptions</option>
              <option value="product">Specific products</option>
            </select>
          </div>

          <div>
            <label htmlFor="discount-min-purchase">Minimum purchase (₹)</label>
            <input
              id="discount-min-purchase"
              type="number"
              min="0"
              step="0.01"
              value={minPurchase}
              onChange={e => setMinPurchase(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="discount-min-qty">Minimum quantity</label>
            <input
              id="discount-min-qty"
              type="number"
              min="0"
              step="1"
              value={minQty}
              onChange={e => setMinQty(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="discount-start">Start date</label>
            <input
              id="discount-start"
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="discount-end">End date</label>
            <input
              id="discount-end"
              type="date"
              min={startDate || undefined}
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="discount-limit">Usage limit</label>
            <input
              id="discount-limit"
              type="number"
              min="1"
              step="1"
              value={usageLimit}
              onChange={e => setUsageLimit(e.target.value)}
              placeholder="Leave empty for unlimited"
            />
          </div>
        </div>

        {appliesTo === 'product' && (
          <div>
            <label>Choose products</label>

            {loadingProducts ? (
              <p className="hint">Loading products...</p>
            ) : products.length === 0 ? (
              <p className="hint">No active products available. Create a product first.</p>
            ) : (
              <div className="card" style={{ maxHeight: 180, overflowY: 'auto' }}>
                {products.map(product => (
                  <label
                    key={product._id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      marginBottom: 8,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedProducts.includes(product._id)}
                      onChange={() => toggleProduct(product._id)}
                    />
                    <span>{product.name}</span>
                  </label>
                ))}
              </div>
            )}

            <p className="hint">
              Selected products: {selectedProducts.length}
            </p>
          </div>
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
            disabled={saving || loadingProducts}
          >
            {saving ? 'Saving...' : discount ? 'Update Discount' : 'Create Discount'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function Discounts() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('true');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingDiscount, setEditingDiscount] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const debouncedSearch = useDebounce(search, 350);

  const loadDiscounts = useCallback(async () => {
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

      const result = await api.get('/discounts', { params });

      setItems(result.items || []);
      setTotal(result.total || 0);
      setPages(result.pages || 1);
    } catch (err) {
      setError(err.message || 'Unable to load discounts.');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, status]);

  useEffect(() => {
    loadDiscounts();
  }, [loadDiscounts]);

  function openCreateModal() {
    setEditingDiscount(null);
    setShowModal(true);
  }

  function openEditModal(discount) {
    setEditingDiscount(discount);
    setShowModal(true);
  }

  async function archiveDiscount(discount) {
    if (!window.confirm(`Archive "${discount.name}"?`)) return;

    try {
      await api.delete(`/discounts/${discount._id}`);
      await loadDiscounts();
    } catch (err) {
      setError(err.message || 'Unable to archive discount.');
    }
  }

  function handleSaved() {
    setShowModal(false);
    setEditingDiscount(null);
    loadDiscounts();
  }

  function formatDate(value) {
    if (!value) return '-';

    return new Date(value).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  function formatValue(discount) {
    return discount.type === 'percent'
      ? `${discount.value}%`
      : `₹${Number(discount.value).toLocaleString('en-IN')}`;
  }

  return (
    <>
      <PageHeader title="Discounts">
        <button className="btn primary" onClick={openCreateModal}>
          + Add Discount
        </button>
      </PageHeader>

      <div className="filters">
        <input
          value={search}
          onChange={e => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search discounts..."
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
          <option value="all">All discounts</option>
        </select>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Discount</th>
                <th>Applies to</th>
                <th>Validity</th>
                <th>Usage</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7">Loading discounts...</td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan="7">No discounts found.</td>
                </tr>
              ) : (
                items.map(discount => (
                  <tr key={discount._id}>
                    <td>{discount.name}</td>

                    <td>{formatValue(discount)}</td>

                    <td>
                      {discount.appliesTo === 'product'
                        ? `Products (${discount.products?.length || 0})`
                        : 'Subscriptions'}
                    </td>

                    <td>
                      {formatDate(discount.startDate)} – {formatDate(discount.endDate)}
                    </td>

                    <td>
                      {discount.usedCount || 0} / {discount.usageLimit ?? '∞'}
                    </td>

                    <td>
                      <span className={`badge ${discount.active ? 'success' : ''}`}>
                        {discount.active ? 'Active' : 'Archived'}
                      </span>
                    </td>

                    <td>
                      <div className="actions">
                        <button
                          className="btn"
                          onClick={() => openEditModal(discount)}
                          disabled={!discount.active}
                        >
                          Edit
                        </button>

                        {discount.active && (
                          <button
                            className="btn"
                            onClick={() => archiveDiscount(discount)}
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
        <DiscountModal
          discount={editingDiscount}
          onClose={() => setShowModal(false)}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}
