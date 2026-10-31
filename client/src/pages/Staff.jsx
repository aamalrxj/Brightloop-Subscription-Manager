
import { useState } from 'react';
import api from '../api';
import PageHeader from '../components/PageHeader';

const passwordRule = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{9,}$/;

export default function Staff() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  function update(field, value) {
    setForm(current => ({ ...current, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess(null);

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

      const result = await api.post('/auth/staff', {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      });

      setSuccess(result);
      setForm({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
      });
    } catch (err) {
      setError(err.message || 'Unable to create staff account.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="Staff Management" />

      <div className="card" style={{ maxWidth: 650 }}>
        <h2>Create Staff Account</h2>
        <p className="muted">
          Create an account for an employee who needs access to the
          subscription management dashboard.
        </p>

        {success && (
          <div className="success">
            <strong>Staff account created successfully!</strong>
            <p>Name: {success.name}</p>
            <p>Email: {success.email}</p>
            <p>Role: {success.role}</p>
          </div>
        )}

        {error && <p className="error">{error}</p>}

        <form onSubmit={handleSubmit}>
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
              placeholder="Create a password"
              required
            />
          </label>

          <p className="hint">
            Minimum 9 characters, including uppercase, lowercase and a special character.
          </p>

          <label>
            Confirm password
            <input
              type="password"
              value={form.confirmPassword}
              onChange={e => update('confirmPassword', e.target.value)}
              placeholder="Re-enter password"
              required
            />
          </label>

          <button
            type="submit"
            className="btn primary"
            disabled={saving}
          >
            {saving ? 'Creating account...' : 'Create Staff Account'}
          </button>
        </form>
      </div>
    </>
  );
}
