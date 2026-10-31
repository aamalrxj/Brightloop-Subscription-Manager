import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import AuthShell from './AuthShell';
import { pwdOk } from './Signup';

export default function Reset() {
  const { token } = useParams();
  const nav = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const submit = async e => {
    e.preventDefault(); setError('');
    if (!pwdOk(password)) return setError('Password must be 9+ characters with an uppercase letter, a lowercase letter and a special character');
    try { await api.post(`/auth/reset/${token}`, { password }); setDone(true); setTimeout(() => nav('/login'), 1500); }
    catch (err) { setError(err.message); }
  };

  return (
    <AuthShell title="Choose a new password" footer={<Link to="/login">Back to log in</Link>}>
      {done ? <div className="success">Password updated. Redirecting to log in...</div> : (
        <form onSubmit={submit}>
          <label>New password<input type="password" required value={password} onChange={e => setPassword(e.target.value)} /></label>
          {error && <div className="error">{error}</div>}
          <button className="btn primary block">Update password</button>
        </form>
      )}
    </AuthShell>
  );
}