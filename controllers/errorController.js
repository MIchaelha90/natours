const AppError = require('../utils/appError');

// ----- handle exceptions / operational error -----
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
  const message = `${err.keyValue.email} is already taken. Please use another value`;
  return new AppError(message, 400);
};

const handleValidatorErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);

  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleJWTError = () => {
  return new AppError(
    'Invalid token. You need to be logged in to access the page',
    401
  );
};

const handleJTWExpired = () => {
  return new AppError('Your login session expired. Please login again', 401);
};
// ----- sending responses ------
const sendErrorDev = (err, req, res) => {
  // A) API
  if (req.originalUrl.startsWith('/api')) {
    return res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack,
    });
  }
  // B) RENDERED WEBSITE
  console.error('ERROR!!!', err);
  res.status(err.statusCode).render('errorPage', {
    title: 'Something went wrong!',
    msg: err.message,
  });
};

const sendErrorProd = (err, req, res) => {
  // A) API
  if (req.originalUrl.startsWith('/api')) {
    if (err.isOperational) {
      // a) operational, trusted error: send message to client
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });
    }
    // b) Programming or other unknown errors: don't leak error details
    // 1) Log error and
    console.error('ERROR!!!', err);
    // 2) send generic message
    return res.status(500).json({
      status: 'error',
      message: 'Generic message - Something went very wrong"!',
    });
  }

  // B) RENDERED WEBSITE
  // a) operational, trusted error: send message to client
  if (err.isOperational) {
    console.log(err);
    return res.status(err.statusCode).render('errorPage', {
      title: 'Something went wrong!',
      msg: err.message,
    });
  }
  // b) Programming or other unknown errors: don't leak error details
  // 1) Log error and
  console.error('ERROR!!!', err);
  // 2) send generic message
  return res.status(500).render('errorPage', {
    title: 'Something went wrong',
    msg: 'Please try again later',
  });
};

// ------  Global error handling middleware -------
module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  //We don't want the client to receive error details
  if (process.env.NODE_ENV === 'development') {
    //console.log('------ valdation error ------');

    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = err;

    //console.log(error);

    // pass the mongoose error, it will return a new error created with our AppError class
    // and that error will then be marked as operational
    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError') error = handleValidatorErrorDB(error); // can't see name property in response object, but it probably lives in prototype
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJTWExpired();

    sendErrorProd(error, req, res);
  }
};
