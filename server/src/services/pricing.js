import Product from '../models/Product.js';
import { httpError } from '../utils/http.js';

export const round2 = n => Math.round((n + Number.EPSILON) * 100) / 100;

// input: [{ product, variant?, qty }]  ->  priced lines with tax snapshot
export async function priceLines(inputLines, plan) {
  if (!inputLines?.length) throw httpError(400, 'Add at least one product line');

  const products = await Product.find({
    _id: { $in: inputLines.map(l => l.product) }, active: true,
  }).populate('tax').lean();
  const byId = new Map(products.map(p => [String(p._id), p]));

  return inputLines.map(l => {
    const p = byId.get(String(l.product));
    if (!p) throw httpError(400, 'A product on the lines was not found or is inactive');
    if (plan && l.qty < plan.minQty)
      throw httpError(400, `Minimum quantity for this plan is ${plan.minQty}`);

    let extra = 0, variantLabel;
    if (l.variant) {
      const v = p.variants.find(v => String(v._id) === String(l.variant));
      if (!v) throw httpError(400, `Variant not found on ${p.name}`);
      extra = v.extraPrice;
      variantLabel = `${v.attribute}: ${v.value}`;
    }

    const unitPrice = round2(p.salesPrice + extra);
    const amount = round2(unitPrice * l.qty);
    const taxRate = p.tax?.active ? p.tax.rate : 0;
    return {
      product: p._id, variant: l.variant, name: p.name, variantLabel,
      qty: l.qty, unitPrice, taxName: p.tax?.name, taxRate,
      amount, taxAmount: round2((amount * taxRate) / 100),
    };
  });
}

export const totals = lines => {
  const subtotal = round2(lines.reduce((s, l) => s + l.amount, 0));
  const taxTotal = round2(lines.reduce((s, l) => s + l.taxAmount, 0));
  return { subtotal, taxTotal, total: round2(subtotal + taxTotal) };
};