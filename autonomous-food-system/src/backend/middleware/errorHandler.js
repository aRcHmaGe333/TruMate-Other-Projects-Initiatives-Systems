const logger = require('../utils/logger');

/**
 * Global error handler middleware
 * Handles all errors that occur in the application
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  logger.logError(err, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.body,
    params: req.params,
    query: req.query
  });

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = { message, statusCode: 404 };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = { message, statusCode: 400 };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = { message, statusCode: 400 };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = { message, statusCode: 401 };
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = { message, statusCode: 401 };
  }

  // Recipe validation errors
  if (err.name === 'RecipeValidationError') {
    error = { message: err.message, statusCode: 400, details: err.details };
  }

  // Automation errors
  if (err.name === 'AutomationError') {
    error = { message: err.message, statusCode: 422, details: err.details };
  }

  // Cooking process errors
  if (err.name === 'CookingProcessError') {
    error = { message: err.message, statusCode: 409, details: err.details };
  }

  // Hardware errors
  if (err.name === 'HardwareError') {
    error = { message: err.message, statusCode: 503, details: err.details };
  }

  // Rate limiting errors
  if (err.name === 'RateLimitError') {
    error = { message: 'Too many requests', statusCode: 429 };
  }

  // File upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    error = { message: 'File too large', statusCode: 413 };
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    error = { message: 'Too many files', statusCode: 413 };
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    error = { message: 'Unexpected file field', statusCode: 400 };
  }

  // Default error response
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';

  // Prepare error response
  const errorResponse = {
    success: false,
    error: {
      message,
      ...(error.details && { details: error.details }),
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
      timestamp: new Date().toISOString(),
      requestId: req.id || 'unknown'
    }
  };

  // Add additional context for specific error types
  if (statusCode >= 500) {
    errorResponse.error.type = 'server_error';
    errorResponse.error.code = 'INTERNAL_SERVER_ERROR';
  } else if (statusCode >= 400) {
    errorResponse.error.type = 'client_error';
    
    switch (statusCode) {
      case 400:
        errorResponse.error.code = 'BAD_REQUEST';
        break;
      case 401:
        errorResponse.error.code = 'UNAUTHORIZED';
        break;
      case 403:
        errorResponse.error.code = 'FORBIDDEN';
        break;
      case 404:
        errorResponse.error.code = 'NOT_FOUND';
        break;
      case 409:
        errorResponse.error.code = 'CONFLICT';
        break;
      case 422:
        errorResponse.error.code = 'UNPROCESSABLE_ENTITY';
        break;
      case 429:
        errorResponse.error.code = 'TOO_MANY_REQUESTS';
        break;
      default:
        errorResponse.error.code = 'CLIENT_ERROR';
    }
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
};

/**
 * Custom error classes
 */
class RecipeValidationError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = 'RecipeValidationError';
    this.details = details;
  }
}

class AutomationError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'AutomationError';
    this.details = details;
  }
}

class CookingProcessError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'CookingProcessError';
    this.details = details;
  }
}

class HardwareError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'HardwareError';
    this.details = details;
  }
}

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors automatically
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * 404 handler for undefined routes
 */
const notFound = (req, res, next) => {
  const error = new Error(`Not found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

module.exports = {
  errorHandler,
  asyncHandler,
  notFound,
  RecipeValidationError,
  AutomationError,
  CookingProcessError,
  HardwareError
};
