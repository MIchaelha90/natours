// Helper class with the purpose of making errors reusable
// Instances can be passed into next()
class AppError extends Error {
  constructor(message, statusCode) {
    // call the parent constructor
    super(message);

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
