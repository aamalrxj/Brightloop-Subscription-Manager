
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
  const [status, setStatus] = useState('all');

  const [creating, setCreating] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState('');
  const [actionError, setActionError] = useState('');

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
          active: status === 'all' ? undefined : status,
        },
      }),
    [page, debouncedSearch, status]
  );

  const customers = data?.items || [];

  const updateField = (e) => {
    const { name, value } = e.target;

    setForm(previous => ({
      ...previous,
      [name]: value,
    }));
  };

  const closeModal = () => {
    if (saving) return;

    setCreating(false);
    setEditingCustomer(null);
    setForm(initialForm);
    setFormError('');
  };

  const openCreateModal = () => {
    setForm(initialForm);
    setFormError('');
    setEditingCustomer(null);
    setCreating(true);
  };

  const openEditModal = (customer) => {
    setForm({
      name: customer.name || '',
      email: customer.email || '',
      password: '',
    });

    setFormError('');
    setCreating(false);
    setEditingCustomer(customer);
  };

  const validateForm = () => {
    if (!form.name.trim()) {
      return 'Customer name is required.';
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      return 'Enter a valid email address.';
    }

    if (
      creating &&
      (
        form.password.length <= 8 ||
        !/[A-Z]/.test(form.password) ||
        !/[a-z]/.test(form.password) ||
        !/[^A-Za-z0-9]/.test(form.password)
      )
    ) {
      return 'Password must be longer than 8 characters and contain uppercase, lowercase and a special character.';
    }

    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setFormError('');
    setSuccess('');
    setActionError('');

    const validationError = validateForm();

    if (validationError) {
      setFormError(validationError);
      return;
    }

    try {
      setSaving(true);

      if (editingCustomer) {
        await api.patch(`/customers/${editingCustomer._id}`, {
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
        });

        setSuccess('Customer details updated successfully.');
      } else {
        await api.post('/customers', {
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
        });

        setSuccess('Customer created successfully!');
        setPage(1);
        setSearch('');
        setStatus('all');
      }

      setCreating(false);
      setEditingCustomer(null);
      setForm(initialForm);

      await reload();
    } catch (err) {
      setFormError(err.message || 'Unable to save customer.');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (customer) => {
    const currentlyActive = customer.active !== false;
    const nextStatus = !currentlyActive;

    const action = nextStatus ? 'activate' : 'deactivate';

    const confirmed = window.confirm(
      `Are you sure you want to ${action} ${customer.name}'s account?`
    );

    if (!confirmed) return;

    setSuccess('');
    setActionError('');

    try {
      await api.patch(`/customers/${customer._id}`, {
        active: nextStatus,
      });

      setSuccess(
        `${customer.name}'s account has been ${nextStatus ? 'activated' : 'deactivated'}.`
      );

      await reload();
    } catch (err) {
      setActionError(
        err.message || `Unable to ${action} customer account.`
      );
    }
  };

  return (
    <div>
      <PageHeader title="Customers">
        <button
          className="btn primary"
          onClick={openCreateModal}
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

      {/* Search and filters */}
      <div className="card filters">
        <label style={{ flex: 1, minWidth: 240 }}>
          Search Customers
          <input
            type="search"
            placeholder="Search by customer name or email..."
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </label>

        <label>
          Account Status
          <select
            value={status}
            onChange={e => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">All Customers</option>
            <option value="true">Active</option>
            <option value="false">Deactivated</option>
          </select>
        </label>

        <button
          className="btn"
          onClick={() => {
            setSearch('');
            setStatus('all');
            setPage(1);
          }}
        >
          Clear Filters
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
      {success && <div className="success">{success}</div>}
      {actionError && <div className="error">{actionError}</div>}
      {error && <div className="error">{error}</div>}

      {/* Customer table */}
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
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading && !data && (
                <tr>
                  <td colSpan="6" className="muted">
                    Loading customers...
                  </td>
                </tr>
              )}

              {!loading && !error && customers.length === 0 && (
                <tr>
                  <td colSpan="6" className="muted">
                    No customers found.
                  </td>
                </tr>
              )}

              {customers.map((customer, index) => {
                const active = customer.active !== false;

                return (
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
                        ? new Date(customer.createdAt).toLocaleDateString('en-IN')
                        : '—'}
                    </td>

                    <td>
                      <span className={`badge ${active ? 'success' : ''}`}>
                        {active ? 'Active' : 'Deactivated'}
                      </span>
                    </td>

                    <td>
                      <div className="actions">
                        <button
                          className="btn"
                          onClick={() => openEditModal(customer)}
                        >
                          Edit
                        </button>

                        <button
                          className="btn"
                          onClick={() => handleStatusChange(customer)}
                        >
                          {active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
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

      {/* Create / Edit Customer Modal */}
      {(creating || editingCustomer) && (
        <Modal
          title={editingCustomer ? 'Edit Customer' : 'Create New Customer'}
          onClose={closeModal}
        >
          <form onSubmit={handleSubmit}>
            {formError && (
              <div className="error">{formError}</div>
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

            {creating && (
              <>
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
              </>
            )}

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
                {saving
                  ? 'Saving...'
                  : editingCustomer
                    ? 'Save Changes'
                    : 'Create Customer'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
