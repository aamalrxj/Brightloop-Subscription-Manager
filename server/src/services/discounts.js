import Discount from '../models/Discount.js';
import { round2 } from './pricing.js';

// valid on the billing date and not yet used up (loaded once per billing run)
export const loadDiscounts = asOf => Discount.find({
  active: true, startDate: { $lte: asOf }, endDate: { $gte: asOf },
  $or: [{ usageLimit: null }, { $expr: { $lt: ['$usedCount', '$usageLimit'] } }],
}).lean();

// returns { discount, total, alloc[] } or null if the discount does not apply
export function evaluate(d, lines) {
  const idx = lines.flatMap((l, i) =>
    d.appliesTo === 'subscription' || d.products.some(p => String(p) === String(l.product)) ? [i] : []);
  if (!idx.length) return null;

  const base = round2(idx.reduce((s, i) => s + lines[i].amount, 0));
  const qty = idx.reduce((s, i) => s + lines[i].qty, 0);
  if (base <= 0 || base < d.minPurchase || qty < d.minQty) return null;

  const total = d.type === 'percent' ? round2((base * d.value) / 100) : Math.min(d.value, base);
  if (total <= 0) return null;

  // spread the discount across eligible lines so tax is computed on the discounted amount
  const alloc = lines.map(() => 0);
  let left = total;
  idx.forEach((i, k) => {
    const share = k === idx.length - 1 ? left : round2((total * lines[i].amount) / base);
    alloc[i] = share;
    left = round2(left - share);
  });
  return { discount: d, total, alloc };
}

// best applicable first
export const rank = (discounts, lines) =>
  discounts.map(d => evaluate(d, lines)).filter(Boolean).sort((a, b) => b.total - a.total);

// atomic: only succeeds while the usage limit has room
export const reserve = async d => (await Discount.updateOne(
  { _id: d._id, $or: [{ usageLimit: null }, { $expr: { $lt: ['$usedCount', '$usageLimit'] } }] },
  { $inc: { usedCount: 1 } },
)).modifiedCount === 1;

export const release = id => Discount.updateOne({ _id: id, usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 } });