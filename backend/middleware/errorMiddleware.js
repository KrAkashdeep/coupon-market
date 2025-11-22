/**
 * Global Error Handler Middleware
 * Catches all unhandled errors and returns consistent error responses
 */

const errorHandler = (err, req, res, next) => {
  // Log error in development mode
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', err);
    console.error('Stack:', err.stack);
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      error: 'Validation Error',
      details: errors
    });
  }

  // Handle Mongoose duplicate key errors
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(409).json({
      error: `${field} already exists`
    });
  }

  // Handle Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      error: 'Invalid ID format'
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expired'
    });
  }

  // Default error response
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'An error occurred' 
    : err.message || 'Internal Server Error';

  res.status(statusCode).json({
    error: message
  });
};

module.exports = errorHandler;
