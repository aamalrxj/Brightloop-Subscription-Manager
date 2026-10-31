import mongoose from 'mongoose';

export default mongoose.model('Tax', new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  rate: { type: Number, required: true, min: 0, max: 100 }, // percent, exclusive
  active: { type: Boolean, default: true },
}, { timestamps: true }));