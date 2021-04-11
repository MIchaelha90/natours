const crypto = require('crypto');
const { promisify } = require('util'); // node builtin fuction
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Email = require('../utils/email');

//-------------------------  Helper Methods ---------------------------------------

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, res) => {
  //Remember in MongoDB the id is actually called _id
  // Token header createed automatically when creating a new user
  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true, // can't be accessed or modified by browser. Prevent cross-site scripting attacks
  };

  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true; // only HTTPS, encrypted connection

  res.cookie('jwt', token, cookieOptions);

  // remove password from repsonse password
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

//-------------------------  Controllers ---------------------------------------

exports.signup = catchAsync(async (req, res, next) => {
  // only put in the data we need, so that people can't manually put somehthing in e.g. Admin: true
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordChangedAt: req.body.passwordChangedAt,
    role: req.body.role,
  });

  const url = `${req.protocol}://${req.get('host')}/me`;
  const email = new Email(newUser, url);
  email.sendWelcome();

  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1) check if email and password exist
  if (!email || !password) {
    // we return, so the function doesn't go further down
    return next(new AppError('Please provide email and password', 400));
  }

  // 2) check if user exist &&  password is correct. + to reinclude password from model
  const user = await User.findOne({ email: email }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email and password', 401));
  }

  // 3) if everything is ok, send token to client
  createSendToken(user, 200, res);
});

exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({
    status: 'success',
  });
};

// middleware for protecting routes
exports.protect = catchAsync(async (req, res, next) => {
  // 1) Getting Token and check if it's there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    // read JWT from a cookie if there is no token in the authorization header
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(
      new AppError('You are not logged in. Please log in to get access', 401)
    );
  }
  // 2) Verification of the token - no one altered - Promisify builtin node
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) Check of user still exists (thereby make token invalid)
  // this is why we have the ID in the JWT payload
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError('The user of the token does no longer exist', 401)
    );
  }

  // 4) Check if user changed password after the JWT token was issued. Instance method
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('Password has recently been changed, please login again'),
      401
    );
  }

  // 5) If everything is correct, next route handler - Grant access to protected route
  // save to current user in req.user to make it availible in other middleware e.g restricTo()
  req.user = currentUser;
  res.locals.user = currentUser;
  next();
});

//wrapper function to pass parameters into middleware
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    //function hasaccess to roles['admin','lead-guide'] because there is a closure
    // Have req.user.role from previous middleware
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }
    next();
  };
};

// only for rendered pages, there will be no errors
exports.isLoggedIn = async (req, res, next) => {
  try {
    if (req.cookies.jwt) {
      // 1) Verify the token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );

      // 2) Check of user still exists
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }

      // 3) Check if user changed password after the JWT token was issued. Instance method
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      // THERE IS A LOGGED IN USER - store in variable in the response
      res.locals.user = currentUser;
      return next();
    }
  } catch (err) {
    // THERE IS NO LOGGED IN USER
    return next();
  }
  next();
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  //1) get user based on posted emails
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(new AppError('There is no user with that email address', 404));
  }

  //2) Generate the random token -- find bug here
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false }); // ignore model validators

  //3) send it back as an email
  try {
    const resetURL = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/users/resetPassword/${resetToken}`;
    await new Email(user, resetURL).sendPasswordReset();

    // dont put reset token in response, or other people can get the reset token
    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError('There was an error sending the email, try again later', 500)
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) get user based on the Token from the URL wildcard
  console.log(`token from url: ${req.params.token}`);
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  console.log(`Database look up on token: ${hashedToken}`);

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  }); //the token only thing we know about the user

  // 2) if token has not expired, and there is a user, set the new passwordResetExpires
  if (!user) {
    return next(new AppError('Token is invalid or is expired', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // 3) Update changedPasswordAt property for the users
  // 4) log the user in, send JWT
  createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1) get user from collection. We have the id from protect middleware
  // remember to await otherwise can't find function
  const currentUser = await User.findById(req.user.id).select('+password');

  if (!currentUser) {
    return next(new AppError('The user of the token no longer exits'), 401);
  }

  // 2) Check if POSTed current password is correctPassword
  if (
    !(await currentUser.correctPassword(
      req.body.passwordCurrent,
      currentUser.password
    ))
  ) {
    return next(new AppError('Passwords does not match', 401));
  }

  console.log(req.body.password);
  console.log(req.body.passwordConfirm);

  // 3) if so updatePassword
  currentUser.password = req.body.password;
  currentUser.passwordConfirm = req.body.passwordConfirm;
  await currentUser.save();

  // 4) Log user in, send JWT
  createSendToken(currentUser, 200, res);
});
