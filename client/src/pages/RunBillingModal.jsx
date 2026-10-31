import { useState } from 'react';
import api from '../api';
import Modal from '../components/Modal';
import { isoDay } from '../utils/format';

export default function RunBillingModal({ onClose, onDone }) {
  const [day, setDay] = useState(isoDay(new Date()));
  const [autoConfirm, setAutoConfirm] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true); setError('');
    try { setResult(await api.post('/billing/run', { date: day, autoConfirm })); onDone(); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  return (
    <Modal title="Run billing" onClose={onClose}>
      {!result ? (
        <>
          <p className="muted">Creates an invoice for every active subscription whose billing date has arrived.
            Running it again never creates duplicates.</p>
          <label>Bill as of<input type="date" value={day} onChange={e => setDay(e.target.value)} /></label>
          <label className="check">
            <input type="checkbox" checked={autoConfirm} onChange={e => setAutoConfirm(e.target.checked)} />
            Confirm invoices automatically
          </label>
          {error && <div className="error">{error}</div>}
          <button className="btn primary block" disabled={busy || !day} onClick={run}>
            {busy ? 'Billing...' : 'Run billing'}
          </button>
        </>
      ) : (
        <>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
            <div className="card stat"><div className="label">Invoices created</div><div className="value" style={{ color: 'var(--ok)' }}>{result.created}</div></div>
            <div className="card stat"><div className="label">Already billed</div><div className="value">{result.skipped}</div></div>
            <div className="card stat"><div className="label">Failed</div><div className="value" style={{ color: result.failed ? 'var(--bad)' : undefined }}>{result.failed}</div></div>
            <div className="card stat"><div className="label">Auto-closed</div><div className="value">{result.closed}</div></div>
          </div>
          {result.errors.map((e, i) => <div className="error" key={i}>{e.subscription}: {e.message}</div>)}
          <button className="btn block" onClick={onClose}>Done</button>
        </>
      )}
    </Modal>
  );
}