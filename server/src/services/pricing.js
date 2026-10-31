
import Product from '../models/Product.js';
import { httpError } from '../utils/http.js';

export const round2 = n =>
  Math.round((n + Number.EPSILON) * 100) / 100;

// Validate included products and calculate selected variant surcharges.
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

    const qty = Number(line.qty);

    if (!Number.isInteger(qty) || qty < 1) {
      throw httpError(400, 'Product quantity must be a whole number of at least 1');
    }

    if (plan && qty < plan.minQty) {
      throw httpError(
        400,
        `Minimum quantity for this plan is ${plan.minQty}`
      );
    }

    let variantLabel;
    let variantExtraPrice = 0;

    if (line.variant) {
      const variant = product.variants.find(
        item => String(item._id) === String(line.variant)
      );

      if (!variant) {
        throw httpError(400, `Variant not found on ${product.name}`);
      }

      variantLabel = `${variant.attribute}: ${variant.value}`;
      variantExtraPrice = round2(Number(variant.extraPrice || 0));
    }

    return {
      product: product._id,
      variant: line.variant || undefined,
      name: product.name,
      variantLabel,
      variantExtraPrice,
      qty,

      // Base product price remains included in the plan.
      unitPrice: 0,
      amount: 0,
      taxName: undefined,
      taxRate: 0,
      taxAmount: 0,
    };
  });
}

// Calculate package price including selected variant surcharges.
export function packageTotals(plan, lines = []) {
  const variantSurcharges = round2(
    lines.reduce(
      (sum, line) =>
        sum + Number(line.variantExtraPrice || 0) * Number(line.qty || 0),
      0
    )
  );

  const subtotal = round2(Number(plan.price) + variantSurcharges);
  const taxRate = plan.tax?.active ? Number(plan.tax.rate || 0) : 0;
  const taxTotal = round2((subtotal * taxRate) / 100);

  return {
    packagePrice: subtotal,
    taxName: plan.tax?.active ? plan.tax.name : undefined,
    taxRate,
    subtotal,
    taxTotal,
    total: round2(subtotal + taxTotal),
    variantSurcharges,
  };
}
