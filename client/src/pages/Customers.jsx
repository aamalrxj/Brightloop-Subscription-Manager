
import { useState } from 'react';
import api from '../api';
import { useFetch } from '../hooks/useFetch';
import { useDebounce } from '../hooks/useDebounce';
import PageHeader from '../components/PageHeader';
import Pagination from '../components/Pagination';
import Modal from '../components/Modal';

const PAGE_SIZE = 20;

const initialForm = {
  name: '',
  email: '',
  password: '',
};

export default function Customers() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState('');

  const debouncedSearch = useDebounce(search);

  const {
    data,
    error,
    loading,
    reload,
  } = useFetch(
    () =>
      api.get('/customers', {
        params: {
          page,
          limit: PAGE_SIZE,
          q: debouncedSearch || undefined,
        },
      }),
    [page, debouncedSearch]
  );

  const updateField = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPage(1);
    setSuccess('');
  };

  const validateForm = () => {
    if (!form.name.trim()) {
      return 'Customer name is required.';
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      return 'Enter a valid email address.';
    }

    if (
      form.password.length <= 8 ||
      !/[A-Z]/.test(form.password) ||
      !/[a-z]/.test(form.password) ||
      !/[^A-Za-z0-9]/.test(form.password)
    ) {
      return 'Password must be longer than 8 characters and contain uppercase, lowercase and a special character.';
    }

    return '';
  };

  const closeModal = () => {
    if (saving) return;

    setCreating(false);
    setForm(initialForm);
    setFormError('');
  };

  const handleCreate = async (e) => {
    e.preventDefault();

    setFormError('');
    setSuccess('');

    const validationError = validateForm();

    if (validationError) {
      setFormError(validationError);
      return;
    }

    try {
      setSaving(true);

      await api.post('/customers', {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });

      setForm(initialForm);
      setCreating(false);
      setPage(1);
      setSearch('');
      setSuccess('Customer created successfully!');

      // Refresh the customer list.
      // Search is cleared so the newly created customer is visible.
      reload();
    } catch (err) {
      setFormError(err.message || 'Unable to create customer.');
    } finally {
      setSaving(false);
    }
  };

  const customers = data?.items || [];

  return (
    <div>
      <PageHeader title="Customers">
        <button
          className="btn primary"
          onClick={() => {
            setForm(initialForm);
            setFormError('');
            setCreating(true);
          }}
        >
          + Add Customer
        </button>
      </PageHeader>

      {/* Summary */}
      <div className="grid">
        <div className="card stat">
          <div className="label">Total Customers</div>
          <div className="value">
            {data ? data.total.toLocaleString() : '—'}
          </div>
        </div>

        <div className="card stat">
          <div className="label">Current Page</div>
          <div className="value">
            {data ? `${data.page} / ${data.pages || 1}` : '—'}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="card filters">
        <label style={{ flex: 1, minWidth: 240 }}>
          Search Customers
          <input
            type="search"
            placeholder="Search by customer name or email..."
            value={search}
            onChange={handleSearch}
          />
        </label>

        <button
          className="btn"
          onClick={() => {
            setSearch('');
            setPage(1);
          }}
        >
          Clear Search
        </button>

        <button
          className="btn"
          onClick={reload}
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      {/* Messages */}
      {success && (
        <div className="success">
          {success}
        </div>
      )}

      {error && (
        <div className="error">
          {error}
        </div>
      )}

      {/* Customer Table */}
      <div className="card" style={{ padding: 0 }}>
        <div className="card-head">
          <h2>Customer Directory</h2>
          <span className="muted">
            {data ? `${data.total} customers` : 'Loading...'}
          </span>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Customer Name</th>
                <th>Email Address</th>
                <th>Registered On</th>
                <th>Account Type</th>
              </tr>
            </thead>

            <tbody>
              {loading && !data && (
                <tr>
                  <td colSpan="5" className="muted">
                    Loading customers...
                  </td>
                </tr>
              )}

              {!loading && !error && customers.length === 0 && (
                <tr>
                  <td colSpan="5" className="muted">
                    No customers found.
                  </td>
                </tr>
              )}

              {customers.map((customer, index) => (
                <tr key={customer._id}>
                  <td>
                    {(page - 1) * PAGE_SIZE + index + 1}
                  </td>

                  <td>
                    <strong>{customer.name}</strong>
                  </td>

                  <td>{customer.email}</td>

                  <td>
                    {customer.createdAt
                      ? new Date(customer.createdAt).toLocaleDateString()
                      : '—'}
                  </td>

                  <td>
                    <span className="badge">
                      Customer
                    </span>
                  </td>
                </tr>
              ))}
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

      {/* Create Customer Modal */}
      {creating && (
        <Modal
          title="Create New Customer"
          onClose={closeModal}
        >
          <form onSubmit={handleCreate}>
            {formError && (
              <div className="error">
                {formError}
              </div>
            )}

            <label>
              Customer Name *
              <input
                name="name"
                type="text"
                placeholder="Enter customer name"
                value={form.name}
                onChange={updateField}
                required
                autoFocus
              />
            </label>

            <label>
              Email Address *
              <input
                name="email"
                type="email"
                placeholder="customer@example.com"
                value={form.email}
                onChange={updateField}
                required
              />
            </label>

            <label>
              Initial Password *
              <input
                name="password"
                type="password"
                placeholder="Create a strong password"
                value={form.password}
                onChange={updateField}
                required
                minLength={9}
              />
            </label>

            <p className="hint">
              Password must contain more than 8 characters,
              at least one uppercase letter, one lowercase
              letter and one special character.
            </p>

            <div className="actions">
              <button
                type="button"
                className="btn"
                onClick={closeModal}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="btn primary"
                disabled={saving}
              >
                {saving ? 'Creating...' : 'Create Customer'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
