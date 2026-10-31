import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth, homeFor } from '../auth/AuthContext';
import AuthShell from './AuthShell';

export default function Login() {
  const { user, login } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={homeFor(user.role)} replace />;

  const submit = async e => {
    e.preventDefault(); setError(''); setBusy(true);
    try { const u = await login(form.email, form.password); nav(homeFor(u.role)); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  return (
    <AuthShell title="Welcome back" subtitle="Log in to manage your subscriptions"
      footer={<>New here? <Link to="/signup">Create an account</Link></>}>
      <form onSubmit={submit}>
        <label>Email<input type="email" required value={form.email}
          onChange={e => setForm({ ...form, email: e.target.value })} /></label>
        <label>Password<input type="password" required value={form.password}
          onChange={e => setForm({ ...form, password: e.target.value })} /></label>
        {error && <div className="error">{error}</div>}
        <button className="btn primary block" disabled={busy}>{busy ? 'Logging in...' : 'Log in'}</button>
        <div className="auth-foot"><Link to="/forgot">Forgot password?</Link></div>
      </form>
    </AuthShell>
  );
}