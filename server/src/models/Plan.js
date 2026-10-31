
import mongoose from 'mongoose';

const planSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  price: { type: Number, required: true, min: 0 },
  tax: { type: mongoose.Schema.Types.ObjectId, ref: 'Tax', default: null },
  period: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
    required: true,
  },
  minQty: { type: Number, default: 1, min: 1 },
  availableFrom: { type: Date, required: true },
  availableTo: { type: Date, required: true },
  autoClose: { type: Boolean, default: false },
  closable: { type: Boolean, default: false },
  pausable: { type: Boolean, default: false },
  renewable: { type: Boolean, default: false },
  active: { type: Boolean, default: true },
}, { timestamps: true });

planSchema.pre('validate', function (next) {
  if (this.availableTo < this.availableFrom) {
    const error = new Error('availableTo must be after availableFrom');
    error.status = 400;
    return next(error);
  }

  next();
});

export default mongoose.model('Plan', planSchema);
