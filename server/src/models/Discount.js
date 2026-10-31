import mongoose from 'mongoose';

const discountSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  type: { type: String, enum: ['fixed', 'percent'], required: true },
  value: { type: Number, required: true, min: 0 },
  minPurchase: { type: Number, default: 0 },
  minQty: { type: Number, default: 0 },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  usageLimit: { type: Number, default: null },    // null = unlimited
  usedCount: { type: Number, default: 0 },
  appliesTo: { type: String, enum: ['product', 'subscription'], required: true },
  products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  active: { type: Boolean, default: true },
}, { timestamps: true });

discountSchema.index({ active: 1, startDate: 1, endDate: 1 });

discountSchema.pre('validate', function (next) {
  let msg;
  if (this.endDate < this.startDate) msg = 'endDate must be after startDate';
  else if (this.type === 'percent' && this.value > 100) msg = 'Percent discount cannot exceed 100';
  else if (this.appliesTo === 'product' && !this.products.length) msg = 'Select at least one product';
  if (msg) { const e = new Error(msg); e.status = 400; return next(e); }
  next();
});

export default mongoose.model('Discount', discountSchema);