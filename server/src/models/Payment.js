import mongoose from 'mongoose';
const { ObjectId } = mongoose.Schema.Types;

export const METHODS = ['cash', 'bank_transfer', 'card', 'upi', 'cheque', 'other'];

const paymentSchema = new mongoose.Schema({
  invoice: { type: ObjectId, ref: 'Invoice', required: true },
  invoiceNumber: String,                                   // snapshot, saves a populate in lists
  customer: { type: ObjectId, ref: 'User', required: true },
  method: { type: String, enum: METHODS, required: true },
  amount: { type: Number, required: true, min: 0.01 },
  date: { type: Date, required: true },
  note: { type: String, trim: true, maxlength: 500 },
  recordedBy: { type: ObjectId, ref: 'User' },
}, { timestamps: true });

paymentSchema.index({ invoice: 1 });
paymentSchema.index({ date: -1 });                         // revenue by date range
paymentSchema.index({ customer: 1, date: -1 });

export default mongoose.model('Payment', paymentSchema);