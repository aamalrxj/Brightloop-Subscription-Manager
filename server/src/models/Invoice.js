import mongoose from 'mongoose';
const { ObjectId } = mongoose.Schema.Types;

const lineSchema = new mongoose.Schema({
  product: { type: ObjectId, ref: 'Product' },
  name: String, variantLabel: String,
  qty: Number, unitPrice: Number,
  amount: Number,                                   // qty * unitPrice, before discount
  discountAmount: { type: Number, default: 0 },
  taxName: String, taxRate: { type: Number, default: 0 },
  taxAmount: Number,
  total: Number,                                    // amount - discount + tax
}, { _id: false });

const invoiceSchema = new mongoose.Schema({
  number: { type: String, unique: true },
  subscription: { type: ObjectId, ref: 'Subscription', required: true },
  subscriptionNumber: String,
  customer: { type: ObjectId, ref: 'User', required: true },
  customerName: String, customerEmail: String,      // snapshot of customer details
  periodStart: { type: Date, required: true },
  periodEnd: { type: Date, required: true },
  invoiceDate: { type: Date, required: true },
  dueDate: { type: Date, required: true },
  status: { type: String, enum: ['Draft', 'Confirmed', 'Paid', 'Cancelled'], default: 'Draft' },
  lines: [lineSchema],
  discountId: ObjectId, discountName: String,
  subtotal: Number, discountTotal: { type: Number, default: 0 },
  taxTotal: Number, total: Number,
  amountPaid: { type: Number, default: 0 },
  confirmedAt: Date, sentAt: Date, paidAt: Date,
}, { timestamps: true });

// the "never billed twice" guarantee lives in the database
invoiceSchema.index({ subscription: 1, periodStart: 1 }, { unique: true });
invoiceSchema.index({ status: 1, dueDate: 1 });          // overdue and outstanding
invoiceSchema.index({ customer: 1, createdAt: -1 });     // portal and customer filter
invoiceSchema.index({ invoiceDate: -1 });                // reports
invoiceSchema.index({ createdAt: -1 });                  // default list

export default mongoose.model('Invoice', invoiceSchema);