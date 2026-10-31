
import Product from '../models/Product.js';
import { httpError } from '../utils/http.js';

export const round2 = n =>
  Math.round((n + Number.EPSILON) * 100) / 100;

// Validate included products.
// Their individual prices are not charged separately.
export async function priceLines(inputLines, plan) {
  if (!inputLines?.length) {
    throw httpError(400, 'Add at least one included product');
  }

  const products = await Product.find({
    _id: { $in: inputLines.map(line => line.product) },
    active: true,
  }).lean();

  const byId = new Map(
    products.map(product => [String(product._id), product])
  );

  return inputLines.map(line => {
    const product = byId.get(String(line.product));

    if (!product) {
      throw httpError(
        400,
        'A product on the lines was not found or is inactive'
      );
    }

    if (plan && line.qty < plan.minQty) {
      throw httpError(
        400,
        `Minimum quantity for this plan is ${plan.minQty}`
      );
    }

    let variantLabel;

    if (line.variant) {
      const variant = product.variants.find(
        item => String(item._id) === String(line.variant)
      );

      if (!variant) {
        throw httpError(400, `Variant not found on ${product.name}`);
      }

      variantLabel = `${variant.attribute}: ${variant.value}`;
    }

    return {
      product: product._id,
      variant: line.variant,
      name: product.name,
      variantLabel,
      qty: line.qty,

      // Included products have no separate charge.
      unitPrice: 0,
      amount: 0,
      taxName: undefined,
      taxRate: 0,
      taxAmount: 0,
    };
  });
}

// Calculate the complete package price using the plan's tax.
export function packageTotals(plan) {
  const subtotal = round2(plan.price);
  const taxRate = plan.tax?.active ? plan.tax.rate : 0;
  const taxTotal = round2((subtotal * taxRate) / 100);

  return {
    packagePrice: subtotal,
    taxName: plan.tax?.active ? plan.tax.name : undefined,
    taxRate,
    subtotal,
    taxTotal,
    total: round2(subtotal + taxTotal),
  };
}
