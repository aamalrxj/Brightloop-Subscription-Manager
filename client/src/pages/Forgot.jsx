import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import AuthShell from './AuthShell';

export default function Forgot() {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const submit = async e => {
    e.preventDefault(); setError('');
    try { setMsg((await api.post('/auth/forgot', { email })).message); }
    catch (err) { setError(err.message); }
  };

  return (
    <AuthShell title="Reset your password" subtitle="We will send a reset link to your registered email"
      footer={<Link to="/login">Back to log in</Link>}>
      {msg ? <div className="success">{msg}</div> : (
        <form onSubmit={submit}>
          <label>Email<input type="email" required value={email} onChange={e => setEmail(e.target.value)} /></label>
          {error && <div className="error">{error}</div>}
          <button className="btn primary block">Send reset link</button>
        </form>
      )}
    </AuthShell>
  );
}