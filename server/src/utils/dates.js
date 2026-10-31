export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

export const addPeriod = (d, period) => {
  const x = new Date(d);
  if (period === 'daily') x.setDate(x.getDate() + 1);
  else if (period === 'weekly') x.setDate(x.getDate() + 7);
  else {
    const day = x.getDate();                       // clamp: Jan 31 + 1 month = Feb 28
    x.setDate(1);
    x.setMonth(x.getMonth() + (period === 'monthly' ? 1 : 12));
    x.setDate(Math.min(day, new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate()));
  }
  return x;
};