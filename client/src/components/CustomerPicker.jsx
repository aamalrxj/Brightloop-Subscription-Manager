import { useState } from 'react';
import api from '../api';
import { useFetch } from '../hooks/useFetch';
import { useDebounce } from '../hooks/useDebounce';

export default function CustomerPicker({ value, onChange }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const dq = useDebounce(q);
  const { data } = useFetch(() => api.get('/customers', { params: { q: dq || undefined, limit: 8 } }), [dq]);

  if (value) return (
    <div className="picked">
      <span>{value.name} <span className="muted">{value.email}</span></span>
      <button type="button" className="btn ghost small" onClick={() => onChange(null)}>Change</button>
    </div>
  );

  return (
    <div className="picker">
      <input placeholder="Search customer by name or email" value={q}
        onChange={e => setQ(e.target.value)} onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)} />
      {open && (
        <ul className="picker-list">
          {data?.items.map(c => (
            <li key={c._id} onMouseDown={() => { onChange(c); setQ(''); setOpen(false); }}>
              {c.name} <span className="muted">{c.email}</span>
            </li>
          ))}
          {data && !data.items.length && <li className="muted">No customers found</li>}
        </ul>
      )}
    </div>
  );
}