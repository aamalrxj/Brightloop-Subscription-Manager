
import { useCallback, useEffect, useState } from 'react';
import api from '../api';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import { useDebounce } from '../hooks/useDebounce';

function TaxModal({ tax, onClose, onSaved }) {
  const [name, setName] = useState(tax?.name || '');
  const [rate, setRate] = useState(tax?.rate ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const numericRate = Number(rate);

    if (!name.trim()) {
      setError('Tax name is required.');
      return;
    }

    if (rate === '' || !Number.isFinite(numericRate) || numericRate < 0 || numericRate > 100) {
      setError('Enter a tax rate between 0 and 100.');
      return;
    }

    try {
      setSaving(true);

      const payload = {
        name: name.trim(),
        rate: numericRate,
      };

      if (tax) {
        await api.patch(`/taxes/${tax._id}`, payload);
      } else {
        await api.post('/taxes', payload);
      }

      onSaved();
    } catch (err) {
      setError(err.message || 'Unable to save tax.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={tax ? 'Edit Tax' : 'Add Tax'}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="tax-name">Tax name</label>
          <input
            id="tax-name"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. GST"
            required
          />
        </div>

        <div>
          <label htmlFor="tax-rate">Tax rate (%)</label>
          <input
            id="tax-rate"
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={rate}
            onChange={e => setRate(e.target.value)}
            placeholder="e.g. 18"
            required
          />
        </div>

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
            disabled={saving}
          >
            {saving ? 'Saving...' : tax ? 'Update Tax' : 'Create Tax'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function Taxes() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('true');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingTax, setEditingTax] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const debouncedSearch = useDebounce(search, 350);

  const loadTaxes = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const params = {
        page,
        limit: 10,
      };

      if (debouncedSearch.trim()) {
        params.q = debouncedSearch.trim();
      }

      if (status !== 'all') {
        params.active = status;
      }

      const result = await api.get('/taxes', { params });

      setItems(result.items || []);
      setTotal(result.total || 0);
      setPages(result.pages || 1);
    } catch (err) {
      setError(err.message || 'Unable to load taxes.');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, status]);

  useEffect(() => {
    loadTaxes();
  }, [loadTaxes]);

  function openCreateModal() {
    setEditingTax(null);
    setShowModal(true);
  }

  function openEditModal(tax) {
    setEditingTax(tax);
    setShowModal(true);
  }

  async function archiveTax(tax) {
    const confirmed = window.confirm(
      `Archive "${tax.name}"?`
    );

    if (!confirmed) return;

    try {
      await api.delete(`/taxes/${tax._id}`);
      await loadTaxes();
    } catch (err) {
      setError(err.message || 'Unable to archive tax.');
    }
  }

  function handleSaved() {
    setShowModal(false);
    setEditingTax(null);
    loadTaxes();
  }

  function handleSearch(value) {
    setSearch(value);
    setPage(1);
  }

  function handleStatusChange(value) {
    setStatus(value);
    setPage(1);
  }

  return (
    <>
      <PageHeader title="Taxes">
        <button
          className="btn primary"
          onClick={openCreateModal}
        >
          + Add Tax
        </button>
      </PageHeader>

      <div className="filters">
        <input
          value={search}
          onChange={e => handleSearch(e.target.value)}
          placeholder="Search taxes..."
        />

        <select
          value={status}
          onChange={e => handleStatusChange(e.target.value)}
        >
          <option value="true">Active</option>
          <option value="false">Archived</option>
          <option value="all">All taxes</option>
        </select>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Tax Name</th>
                <th>Rate</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5">Loading taxes...</td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan="5">No taxes found.</td>
                </tr>
              ) : (
                items.map(tax => (
                  <tr key={tax._id}>
                    <td>{tax.name}</td>

                    <td>{Number(tax.rate).toFixed(2)}%</td>

                    <td>
                      <span className={`badge ${tax.active ? 'success' : ''}`}>
                        {tax.active ? 'Active' : 'Archived'}
                      </span>
                    </td>

                    <td>
                      {tax.createdAt
                        ? new Date(tax.createdAt).toLocaleDateString('en-IN')
                        : '-'}
                    </td>

                    <td>
                      <div className="actions">
                        <button
                          className="btn"
                          onClick={() => openEditModal(tax)}
                          disabled={!tax.active}
                        >
                          Edit
                        </button>

                        {tax.active && (
                          <button
                            className="btn"
                            onClick={() => archiveTax(tax)}
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
        <TaxModal
          tax={editingTax}
          onClose={() => setShowModal(false)}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}
