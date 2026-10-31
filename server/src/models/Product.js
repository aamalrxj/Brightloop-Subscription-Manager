import mongoose from 'mongoose';

const variantSchema = new mongoose.Schema({
  attribute: { type: String, required: true },  // e.g. Brand
  value: { type: String, required: true },      // e.g. Odoo
  extraPrice: { type: Number, default: 0 },     // e.g. 560
}, { _id: true });

export default mongoose.model('Product', new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  type: { type: String, required: true, trim: true },
  salesPrice: { type: Number, required: true, min: 0 },
  costPrice: { type: Number, required: true, min: 0 },
  notes: String,
  tax: { type: mongoose.Schema.Types.ObjectId, ref: 'Tax' }, // default tax for its lines
  variants: [variantSchema],
  active: { type: Boolean, default: true },
}, { timestamps: true }));