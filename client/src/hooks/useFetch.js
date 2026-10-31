import { useEffect, useState } from 'react';

// fn returns a promise; the request re-runs whenever deps change or reload() is called
export function useFetch(fn, deps = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true); setError('');
    fn().then(d => alive && setData(d))
      .catch(e => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };   // ignore stale responses
  }, [...deps, tick]);

  return { data, error, loading, reload: () => setTick(t => t + 1) };
}