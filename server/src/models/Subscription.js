
import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

const lineSchema = new mongoose.Schema({
  product: { type: ObjectId, ref: 'Product', required: true },
  variant: ObjectId,
  name: String,
  variantLabel: String,

  // Additional price charged for the selected variant.
  variantExtraPrice: { type: Number, default: 0, min: 0 },

  qty: Number,
  unitPrice: Number,
  taxName: String,
  taxRate: { type: Number, default: 0 },
  amount: Number,
  taxAmount: Number,
}, { _id: false });

const subscriptionSchema = new mongoose.Schema({
  number: { type: String, unique: true },
  customer: { type: ObjectId, ref: 'User', required: true },
  plan: { type: ObjectId, ref: 'Plan', required: true },
  template: { type: ObjectId, ref: 'QuotationTemplate' },

  status: {
    type: String,
    enum: ['Draft', 'Quotation', 'Confirmed', 'Active', 'Closed'],
    default: 'Draft',
  },

  startDate: { type: Date, required: true },
  expiryDate: { type: Date, required: true },
  paymentTermDays: { type: Number, default: 0, min: 0 },
  validityDays: { type: Number, default: 30 },
  quotationExpiry: Date,
  nextBillingDate: Date,
  paused: { type: Boolean, default: false },
  closedAt: Date,

  // Snapshot of the package price when this subscription is priced.
  packagePrice: { type: Number, min: 0 },

  // Total additional charges from selected product variants.
  variantSurcharges: { type: Number, default: 0, min: 0 },

  taxName: String,
  taxRate: { type: Number, default: 0 },

  // Products included in the package, not separately billed.
  lines: [lineSchema],

  subtotal: { type: Number, default: 0 },
  taxTotal: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
}, { timestamps: true });

subscriptionSchema.index({ status: 1, nextBillingDate: 1 });
subscriptionSchema.index({ status: 1, paused: 1, nextBillingDate: 1 });
subscriptionSchema.index({ customer: 1, createdAt: -1 });
subscriptionSchema.index({ createdAt: -1 });

export default mongoose.model('Subscription', subscriptionSchema);
