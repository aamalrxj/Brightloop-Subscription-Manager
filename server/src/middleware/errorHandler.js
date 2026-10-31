export const errorHandler = (err, req, res, next) => {
  // If the response has already started, let Express handle the error.
  if (res.headersSent) {
    return next(err);
  }

  // MongoDB duplicate key error
  if (err.code === 11000) {
    return res.status(409).json({
      message: 'A record with this value already exists.'
    });
  }

  // Zod validation error
  if (err.name === 'ZodError') {
    return res.status(400).json({
      message: err.issues?.[0]?.message || 'Invalid input'
    });
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const firstError = Object.values(err.errors || {})[0];

    return res.status(400).json({
      message: firstError?.message || 'Validation failed'
    });
  }

  // Invalid MongoDB ObjectId
  if (err.name === 'CastError') {
    return res.status(400).json({
      message: 'Invalid id'
    });
  }

  // Invalid JSON request body
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      message: 'Invalid JSON request body'
    });
  }

  // Other errors
  const status = err.statusCode || err.status || 500;

  return res.status(status).json({
    message: status >= 500
      ? 'Server error'
      : err.message || 'Request failed'
  });
};