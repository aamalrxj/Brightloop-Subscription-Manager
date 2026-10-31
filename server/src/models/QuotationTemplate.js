import mongoose from 'mongoose';
const { ObjectId } = mongoose.Schema.Types;

export default mongoose.model('QuotationTemplate', new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  plan: { type: ObjectId, ref: 'Plan', required: true },
  validityDays: { type: Number, default: 30, min: 1 },
  lines: [{
    product: { type: ObjectId, ref: 'Product', required: true },
    variant: ObjectId,
    qty: { type: Number, default: 1, min: 1 },
    _id: false,
  }],
  active: { type: Boolean, default: true },
}, { timestamps: true }));