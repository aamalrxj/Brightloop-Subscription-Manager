import { useState } from 'react';
import api from '../api';
import Modal from '../components/Modal';
import { money, isoDay } from '../utils/format';

export const METHODS = ['cash', 'bank_transfer', 'card', 'upi', 'cheque', 'other'];
export const methodLabel = m => m.replace('_', ' ');

export default function RecordPaymentModal({ invoice, onClose, onDone }) {
  const balance = Math.round((invoice.total - invoice.amountPaid) * 100) / 100;
  const [method, setMethod] = useState('bank_transfer');
  const [amount, setAmount] = useState(balance);
  const [day, setDay] = useState(isoDay(new Date()));
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async e => {
    e.preventDefault(); setError('');
    if (!(Number(amount) > 0)) return setError('Enter an amount above zero');
    if (Number(amount) > balance) return setError(`Amount cannot exceed the balance due (${money(balance)})`);
    setBusy(true);
    try {
      await api.post('/payments', { invoice: invoice._id, method, amount: Number(amount), date: day, note: note || undefined });
      onDone();
    } catch (err) { setError(err.message); setBusy(false); }
  };

  return (
    <Modal title={`Record payment for ${invoice.number}`} onClose={onClose}>
      <form onSubmit={submit}>
        <p className="muted">Balance due: <strong>{money(balance)}</strong>. Pay less to record a partial payment.</p>
        <div className="two">
          <label>Method
            <select value={method} onChange={e => setMethod(e.target.value)}>
              {METHODS.map(m => <option key={m} value={m}>{methodLabel(m)}</option>)}
            </select>
          </label>
          <label>Amount<input type="number" step="0.01" min="0.01" value={amount} onChange={e => setAmount(e.target.value)} /></label>
        </div>
        <label>Payment date<input type="date" max={isoDay(new Date())} value={day} onChange={e => setDay(e.target.value)} /></label>
        <label>Note<input placeholder="Reference, cheque number..." maxLength="500" value={note} onChange={e => setNote(e.target.value)} /></label>
        {error && <div className="error">{error}</div>}
        <button className="btn primary block" disabled={busy}>{busy ? 'Saving...' : 'Record payment'}</button>
      </form>
    </Modal>
  );
}