import mongoose from 'mongoose';

const Counter = mongoose.model('Counter', new mongoose.Schema({
  _id: String, seq: { type: Number, default: 0 },
}));

export const nextNumber = async (key, prefix) => {
  const c = await Counter.findByIdAndUpdate(key, { $inc: { seq: 1 } }, { new: true, upsert: true });
  return `${prefix}-${String(c.seq).padStart(4, '0')}`;
};