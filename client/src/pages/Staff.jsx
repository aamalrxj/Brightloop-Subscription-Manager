
import { useCallback, useEffect, useState } from 'react';
import api from '../api';
import PageHeader from '../components/PageHeader';
import Pagination from '../components/Pagination';
import { useDebounce } from '../hooks/useDebounce';

const passwordRule =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{9,}$/;

export default function Staff() {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const debouncedSearch = useDebounce(search, 350);

  const loadStaff = useCallback(async () => {
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

      const result = await api.get('/auth/staff', { params });

      setItems(result.items || []);
      setTotal(result.total || 0);
      setPages(result.pages || 1);
    } catch (err) {
      setError(err.message || 'Unable to load staff accounts.');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, status]);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  function update(field, value) {
    setForm(current => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.name.trim()) {
      setError('Please enter the staff member name.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!passwordRule.test(form.password)) {
      setError(
        'Password must contain at least 9 characters, uppercase, lowercase and a special character.'
      );
      return;
    }

    try {
      setSaving(true);

      await api.post('/auth/staff', {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      });

      setForm({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
      });

      setShowForm(false);
      setSuccess('Staff account created successfully.');

      setPage(1);
      await loadStaff();
    } catch (err) {
      setError(err.message || 'Unable to create staff account.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(staff) {
    const currentlyActive = staff.active !== false;
    const nextStatus = !currentlyActive;

    const action = nextStatus ? 'activate' : 'deactivate';

    if (
      !window.confirm(
        `Are you sure you want to ${action} ${staff.name}'s account?`
      )
    ) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      await api.patch(`/auth/staff/${staff._id}`, {
        active: nextStatus,
      });

      setSuccess(
        `${staff.name}'s account has been ${nextStatus ? 'activated' : 'deactivated'}.`
      );

      await loadStaff();
    } catch (err) {
      setError(err.message || 'Unable to update staff account.');
    }
  }

  return (
    <>
      <PageHeader title="Staff Management">
        <button
          className="btn primary"
          onClick={() => {
            setShowForm(value => !value);
            setError('');
            setSuccess('');
          }}
        >
          {showForm ? 'Close Form' : '+ Add Staff'}
        </button>
      </PageHeader>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      {showForm && (
        <div className="card" style={{ maxWidth: 650, marginBottom: 16 }}>
          <h2>Create Staff Account</h2>

          <form onSubmit={handleCreate}>
            <label>
              Full name
              <input
                type="text"
                value={form.name}
                onChange={e => update('name', e.target.value)}
                placeholder="Enter staff member name"
                required
              />
            </label>

            <label>
              Email address
              <input
                type="email"
                value={form.email}
                onChange={e => update('email', e.target.value)}
                placeholder="staff@example.com"
                required
              />
            </label>

            <label>
              Password
              <input
                type="password"
                value={form.password}
                onChange={e => update('password', e.target.value)}
                required
              />
            </label>

            <p className="hint">
              Minimum 9 characters, including uppercase, lowercase
              and a special character.
            </p>

            <label>
              Confirm password
              <input
                type="password"
                value={form.confirmPassword}
                onChange={e => update('confirmPassword', e.target.value)}
                required
              />
            </label>

            <div className="actions">
              <button
                type="button"
                className="btn"
                onClick={() => setShowForm(false)}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="btn primary"
                disabled={saving}
              >
                {saving ? 'Creating...' : 'Create Staff Account'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <div className="filters">
          <input
            placeholder="Search by name or email..."
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />

          <select
            value={status}
            onChange={e => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">All staff</option>
            <option value="true">Active</option>
            <option value="false">Deactivated</option>
          </select>
        </div>

        <p className="muted">
          Total staff accounts: {total}
        </p>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Created</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5">Loading staff accounts...</td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan="5">No staff accounts found.</td>
                </tr>
              ) : (
                items.map(staff => {
                  const active = staff.active !== false;

                  return (
                    <tr key={staff._id}>
                      <td>{staff.name}</td>
                      <td>{staff.email}</td>

                      <td>
                        {new Date(staff.createdAt).toLocaleDateString('en-IN')}
                      </td>

                      <td>
                        <span className={`badge ${active ? 'success' : ''}`}>
                          {active ? 'Active' : 'Deactivated'}
                        </span>
                      </td>

                      <td>
                        <button
                          className="btn"
                          onClick={() => toggleStatus(staff)}
                        >
                          {active ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  );
                })
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
    </>
  );
}
