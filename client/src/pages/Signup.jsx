import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth, homeFor } from '../auth/AuthContext';
import AuthShell from './AuthShell';

export const pwdOk = p => /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{9,}$/.test(p);

export default function Signup() {
  const { user, signup } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={homeFor(user.role)} replace />;

  const submit = async e => {
    e.preventDefault(); setError('');
    if (!pwdOk(form.password)) return setError('Password must be 9+ characters with an uppercase letter, a lowercase letter and a special character');
    setBusy(true);
    try { const u = await signup(form); nav(homeFor(u.role)); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  return (
    <AuthShell title="Create your account" subtitle="Start managing your subscriptions"
      footer={<>Already registered? <Link to="/login">Log in</Link></>}>
      <form onSubmit={submit}>
        <label>Name<input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
        <label>Email<input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label>
        <label>Password<input type="password" required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></label>
        <p className="hint">9+ characters, one uppercase, one lowercase, one special character</p>
        {error && <div className="error">{error}</div>}
        <button className="btn primary block" disabled={busy}>{busy ? 'Creating...' : 'Sign up'}</button>
      </form>
    </AuthShell>
  );
}