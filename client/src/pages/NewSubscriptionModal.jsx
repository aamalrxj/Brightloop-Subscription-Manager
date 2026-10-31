import { useState } from 'react';
import api from '../api';
import { useFetch } from '../hooks/useFetch';
import Modal from '../components/Modal';
import CustomerPicker from '../components/CustomerPicker';
import { isoDay } from '../utils/format';

const list = path => () => api.get(path, { params: { limit: 50, active: true } });

export default function NewSubscriptionModal({ onClose, onCreated }) {
  const templates = useFetch(list('/templates'));
  const plans = useFetch(list('/plans'));
  const products = useFetch(list('/products'));

  const [customer, setCustomer] = useState(null);
  const [mode, setMode] = useState('template');
  const [templateId, setTemplateId] = useState('');
  const [planId, setPlanId] = useState('');
  const [lines, setLines] = useState([{ product: '', variant: '', qty: 1 }]);
  const [startDate, setStartDate] = useState(isoDay(new Date()));
  const [terms, setTerms] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const tpl = templates.data?.items.find(t => t._id === templateId);
  const prods = products.data?.items ?? [];
  const setLine = (i, patch) => setLines(ls => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  const submit = async e => {
    e.preventDefault(); setError('');
    if (!customer) return setError('Choose a customer');
    const body = { customer: customer._id, startDate, paymentTermDays: Number(terms) || 0 };
    if (mode === 'template') {
      if (!templateId) return setError('Choose a quotation template');
      body.template = templateId;
    } else {
      if (!planId) return setError('Choose a plan');
      if (lines.some(l => !l.product)) return setError('Every line needs a product');
      body.plan = planId;
      body.lines = lines.map(l => ({ product: l.product, variant: l.variant || undefined, qty: Number(l.qty) || 1 }));
    }
    setBusy(true);
    try { onCreated(await api.post('/subscriptions', body)); }
    catch (err) { setError(err.message); setBusy(false); }
  };

  return (
    <Modal title="New subscription" onClose={onClose} wide>
      <form onSubmit={submit}>
        <label>Customer<CustomerPicker value={customer} onChange={setCustomer} /></label>

        <div className="chips" style={{ marginBottom: 12 }}>
          <button type="button" className={`btn small ${mode === 'template' ? 'primary' : ''}`} onClick={() => setMode('template')}>From template</button>
          <button type="button" className={`btn small ${mode === 'manual' ? 'primary' : ''}`} onClick={() => setMode('manual')}>Manual</button>
        </div>

        {mode === 'template' ? (
          <>
            <label>Quotation template
              <select value={templateId} onChange={e => setTemplateId(e.target.value)}>
                <option value="">Select a template</option>
                {templates.data?.items.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
              </select>
            </label>
            {templates.data && !templates.data.items.length && <p className="hint">No templates yet. Use Manual, or create one under Templates.</p>}
            {tpl && (
              <div className="card preview">
                <strong>{tpl.plan?.name}</strong> <span className="muted">{tpl.plan?.period}, valid {tpl.validityDays} days</span>
                <ul>{tpl.lines.map((l, i) => <li key={i}>{l.qty} x {l.product?.name}</li>)}</ul>
              </div>
            )}
          </>
        ) : (
          <>
            <label>Plan
              <select value={planId} onChange={e => setPlanId(e.target.value)}>
                <option value="">Select a plan</option>
                {plans.data?.items.map(p => <option key={p._id} value={p._id}>{p.name} ({p.period})</option>)}
              </select>
            </label>
            <div className="lines">
              <div className="muted" style={{ marginBottom: 6 }}>Product lines</div>
              {lines.map((l, i) => {
                const p = prods.find(p => p._id === l.product);
                return (
                  <div className="line-row" key={i}>
                    <select value={l.product} onChange={e => setLine(i, { product: e.target.value, variant: '' })}>
                      <option value="">Product</option>
                      {prods.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                    </select>
                    <select value={l.variant} disabled={!p?.variants.length} onChange={e => setLine(i, { variant: e.target.value })}>
                      <option value="">{p?.variants.length ? 'No variant' : '-'}</option>
                      {p?.variants.map(v => <option key={v._id} value={v._id}>{v.attribute}: {v.value} (+{v.extraPrice})</option>)}
                    </select>
                    <input type="number" min="1" value={l.qty} onChange={e => setLine(i, { qty: e.target.value })} />
                    <button type="button" className="btn ghost small" disabled={lines.length === 1}
                      onClick={() => setLines(ls => ls.filter((_, j) => j !== i))}>Remove</button>
                  </div>
                );
              })}
              <button type="button" className="btn small" onClick={() => setLines(ls => [...ls, { product: '', variant: '', qty: 1 }])}>Add line</button>
            </div>
          </>
        )}

        <div className="two">
          <label>Start date<input type="date" required value={startDate} onChange={e => setStartDate(e.target.value)} /></label>
          <label>Payment terms (days to pay)<input type="number" min="0" value={terms} onChange={e => setTerms(e.target.value)} /></label>
        </div>

        {error && <div className="error">{error}</div>}
        <button className="btn primary block" disabled={busy}>{busy ? 'Creating...' : 'Create subscription'}</button>
      </form>
    </Modal>
  );
}