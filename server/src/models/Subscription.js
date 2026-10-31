import mongoose from 'mongoose';
const { ObjectId } = mongoose.Schema.Types;

// snapshot of price and tax at the time of pricing, so later edits never rewrite history
const lineSchema = new mongoose.Schema({
  product: { type: ObjectId, ref: 'Product', required: true },
  variant: ObjectId,
  name: String, variantLabel: String,
  qty: Number, unitPrice: Number,
  taxName: String, taxRate: { type: Number, default: 0 },
  amount: Number,       // qty * unitPrice, before tax
  taxAmount: Number,
}, { _id: false });

const subscriptionSchema = new mongoose.Schema({
  number: { type: String, unique: true },
  customer: { type: ObjectId, ref: 'User', required: true },
  plan: { type: ObjectId, ref: 'Plan', required: true },
  template: { type: ObjectId, ref: 'QuotationTemplate' },
  status: { type: String, enum: ['Draft', 'Quotation', 'Confirmed', 'Active', 'Closed'], default: 'Draft' },
  startDate: { type: Date, required: true },
  expiryDate: { type: Date, required: true },
  paymentTermDays: { type: Number, default: 0, min: 0 },   // invoice due = invoice date + this
  validityDays: { type: Number, default: 30 },
  quotationExpiry: Date,
  nextBillingDate: Date,
  paused: { type: Boolean, default: false },
  closedAt: Date,
  lines: [lineSchema],
  subtotal: { type: Number, default: 0 },
  taxTotal: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
}, { timestamps: true });

subscriptionSchema.index({ status: 1, nextBillingDate: 1 });   // billing run
subscriptionSchema.index({ customer: 1, createdAt: -1 });      // portal and customer filter
subscriptionSchema.index({ createdAt: -1 });                   // default list

export default mongoose.model('Subscription', subscriptionSchema);