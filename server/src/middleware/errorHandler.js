export const errorHandler = (err, req, res, next) => {
  if (err.code === 11000) return res.status(409).json({ message: 'Email already registered' });
  if (err.name === 'ZodError')
  if (err.name === 'ValidationError') return res.status(400).json({ message: Object.values(err.errors)[0].message });
  if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid id' });
    return res.status(400).json({ message: err.issues[0].message });
  res.status(err.status || 500).json({ message: err.message || 'Server error' });
};