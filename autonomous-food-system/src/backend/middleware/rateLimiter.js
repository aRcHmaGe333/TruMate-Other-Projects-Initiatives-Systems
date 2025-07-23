/**
 * Rate limiting middleware for TruMate API
 * Implements different rate limits for different endpoints
 */

const rateLimitStore = new Map();

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  const fiveMinutesAgo = now - 5 * 60 * 1000;
  
  for (const [key, data] of rateLimitStore.entries()) {
    if (data.resetTime < fiveMinutesAgo) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Create a rate limiter with specified options
 */
const createRateLimiter = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100, // limit each IP to 100 requests per windowMs
    message = 'Too many requests from this IP, please try again later',
    standardHeaders = true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders = false, // Disable the `X-RateLimit-*` headers
    keyGenerator = (req) => req.ip,
    skip = () => false,
    onLimitReached = () => {}
  } = options;

  return (req, res, next) => {
    if (skip(req)) {
      return next();
    }

    const key = keyGenerator(req);
    const now = Date.now();
    const windowStart = now - windowMs;

    // Get or create rate limit data for this key
    let rateLimitData = rateLimitStore.get(key);
    
    if (!rateLimitData || rateLimitData.resetTime <= windowStart) {
      rateLimitData = {
        count: 0,
        resetTime: now + windowMs,
        firstRequest: now
      };
    }

    // Increment request count
    rateLimitData.count++;
    rateLimitStore.set(key, rateLimitData);

    // Calculate remaining requests
    const remaining = Math.max(0, max - rateLimitData.count);
    const resetTime = Math.ceil(rateLimitData.resetTime / 1000);

    // Set headers
    if (standardHeaders) {
      res.set({
        'RateLimit-Limit': max,
        'RateLimit-Remaining': remaining,
        'RateLimit-Reset': resetTime
      });
    }

    if (legacyHeaders) {
      res.set({
        'X-RateLimit-Limit': max,
        'X-RateLimit-Remaining': remaining,
        'X-RateLimit-Reset': resetTime
      });
    }

    // Check if limit exceeded
    if (rateLimitData.count > max) {
      onLimitReached(req, res);
      
      return res.status(429).json({
        error: 'Too Many Requests',
        message,
        retryAfter: Math.ceil((rateLimitData.resetTime - now) / 1000)
      });
    }

    next();
  };
};

// Default rate limiter for general API endpoints
const generalLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
  message: 'Too many requests from this IP, please try again later'
});

// Strict rate limiter for resource-intensive operations
const strictLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per 15 minutes
  message: 'Too many resource-intensive requests, please try again later'
});

// Recipe creation limiter
const recipeCreationLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 recipe creations per hour
  message: 'Too many recipe creations, please try again later'
});

// Cooking process limiter
const cookingLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // 10 cooking processes per 5 minutes
  message: 'Too many cooking processes started, please wait before starting another'
});

// Search limiter
const searchLimiter = createRateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 searches per minute
  message: 'Too many search requests, please slow down'
});

// File upload limiter
const uploadLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 uploads per 15 minutes
  message: 'Too many file uploads, please try again later'
});

// Dynamic rate limiter that applies different limits based on endpoint
const dynamicRateLimiter = (req, res, next) => {
  const path = req.path;
  const method = req.method;

  // Apply specific limiters based on endpoint
  if (method === 'POST' && path.includes('/recipes') && !path.includes('/scale') && !path.includes('/optimize')) {
    return recipeCreationLimiter(req, res, next);
  }
  
  if (path.includes('/cooking') && (method === 'POST' || method === 'PUT')) {
    return cookingLimiter(req, res, next);
  }
  
  if (path.includes('/search') || req.query.search) {
    return searchLimiter(req, res, next);
  }
  
  if (path.includes('/upload') || req.headers['content-type']?.includes('multipart/form-data')) {
    return uploadLimiter(req, res, next);
  }
  
  if (path.includes('/optimize') || path.includes('/analyze') || path.includes('/automation')) {
    return strictLimiter(req, res, next);
  }

  // Default limiter for all other endpoints
  return generalLimiter(req, res, next);
};

// Rate limiter for health checks (very permissive)
const healthCheckLimiter = createRateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: 'Too many health check requests'
});

// Skip rate limiting for certain conditions
const skipRateLimit = (req) => {
  // Skip for health checks
  if (req.path === '/health') {
    return false; // Don't skip, but use permissive limiter
  }
  
  // Skip for internal requests (if you have internal API keys)
  if (req.headers['x-internal-api-key'] === process.env.INTERNAL_API_KEY) {
    return true;
  }
  
  // Skip for localhost in development
  if (process.env.NODE_ENV === 'development' && req.ip === '127.0.0.1') {
    return false; // Don't skip in development to test rate limiting
  }
  
  return false;
};

// Main rate limiter middleware
const rateLimiter = (req, res, next) => {
  // Special handling for health checks
  if (req.path === '/health') {
    return healthCheckLimiter(req, res, next);
  }
  
  // Check if we should skip rate limiting
  if (skipRateLimit(req)) {
    return next();
  }
  
  // Apply dynamic rate limiting
  return dynamicRateLimiter(req, res, next);
};

module.exports = {
  rateLimiter,
  generalLimiter,
  strictLimiter,
  recipeCreationLimiter,
  cookingLimiter,
  searchLimiter,
  uploadLimiter,
  createRateLimiter
};
