const winston = require('winston');
const path = require('path');

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white'
};

// Tell winston that you want to link the colors
winston.addColors(colors);

// Define which level to log based on environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'warn';
};

// Define different log formats
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

const fileLogFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Define transports
const transports = [
  // Console transport
  new winston.transports.Console({
    level: level(),
    format: logFormat
  }),
  
  // File transport for errors
  new winston.transports.File({
    filename: path.join(process.cwd(), 'logs', 'error.log'),
    level: 'error',
    format: fileLogFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5
  }),
  
  // File transport for all logs
  new winston.transports.File({
    filename: path.join(process.cwd(), 'logs', 'combined.log'),
    format: fileLogFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5
  })
];

// Create the logger
const logger = winston.createLogger({
  level: level(),
  levels,
  format: fileLogFormat,
  transports,
  exitOnError: false
});

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Add request logging helper
logger.logRequest = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const message = `${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`;
    
    if (res.statusCode >= 400) {
      logger.warn(message);
    } else {
      logger.http(message);
    }
  });
  
  next();
};

// Add structured logging methods
logger.logRecipeAction = (action, recipeId, recipeName, userId = null, metadata = {}) => {
  logger.info('Recipe Action', {
    action,
    recipeId,
    recipeName,
    userId,
    metadata,
    timestamp: new Date().toISOString()
  });
};

logger.logCookingEvent = (event, sessionId, recipeId, data = {}) => {
  logger.info('Cooking Event', {
    event,
    sessionId,
    recipeId,
    data,
    timestamp: new Date().toISOString()
  });
};

logger.logSystemEvent = (event, component, data = {}) => {
  logger.info('System Event', {
    event,
    component,
    data,
    timestamp: new Date().toISOString()
  });
};

logger.logError = (error, context = {}) => {
  logger.error('Application Error', {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString()
  });
};

// Add performance monitoring
logger.logPerformance = (operation, duration, metadata = {}) => {
  const level = duration > 1000 ? 'warn' : 'info';
  logger[level]('Performance Metric', {
    operation,
    duration,
    metadata,
    timestamp: new Date().toISOString()
  });
};

// Add automation logging
logger.logAutomation = (event, recipeId, sensorData = {}, actionsTaken = []) => {
  logger.info('Automation Event', {
    event,
    recipeId,
    sensorData,
    actionsTaken,
    timestamp: new Date().toISOString()
  });
};

module.exports = logger;
