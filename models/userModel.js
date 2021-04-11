const mongoose = require('mongoose');
const validator = require('validator'); // third party validator - validator.js npm package
const bcrypt = require('bcryptjs');
const crypto = require('crypto'); // builtin node module

// name, email, photo (string), passwordConfirmed
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please tell us your name!'],
    maxLength: [40, 'The maximum length of a user name is 40 characters'],
  },
  email: {
    type: String,
    required: [true, 'Please provide your email'],
    unique: true,
    trim: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email'],
  },
  photo: {
    type: String,
    default: 'default.jpg',
  },
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user',
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minLength: [8, 'Your password must be at least 8 characters'],
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm password'],
    validate: {
      // need This keyword, so we can't use arrow function.
      //This only works on save() or create() mongoose method !!
      validator: function (el) {
        // passwordConfirm === password, false give validation error
        return el === this.password;
      },
      message: 'Passwords are not the same',
    },
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false, // Dont show in output, dont let users know it's there
  },
});

//--------------------- pre hook middlewares ----------------------

userSchema.pre('save', async function (next) {
  // Only run this function if pasword was actually been updated
  if (!this.isModified('password')) return next();

  // hash(password, cost parameter) the higher the more CPU intensive and better password
  this.password = await bcrypt.hash(this.password, 12);

  //confirmed password deleted - not needed anymore
  // we can delete even if it is required in the Scema, only require for input, not persistence
  this.passwordConfirm = undefined;
  next();
});

// Query middleware - applies to all mongoose find method (regular expression)
userSchema.pre(/^find/, function (next) {
  // "This" points to the current query
  this.find({ active: { $ne: false } });
  next();
});

userSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next();

  // notice: that saving to the database is bit slower than issuing a JSON Token
  // changedPassword timestamp set after the JWT has been created, making it
  // so that the user can't login with the new token
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

//------- instance methods - availible on all documents of a certain collection -----
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPasswordDB
) {
  // this.password will not be availible since we filtered in the userModel
  //Can't compare manually candidatePassword (user types in) is not hashed, while the userPassword is hashed (database).
  // retrun true / false
  return await bcrypt.compare(candidatePassword, userPasswordDB);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  // "this" points to the current document in DB
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    // token becomes invalid. Changed the password after the token was issued
    return JWTTimestamp < changedTimestamp;
  }
  // false means not changed
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  //doesn't need to be cryptographically strong
  const resetToken = crypto.randomBytes(32).toString('hex');

  // store encrypted token (this.passwordResetToken) in database,
  //whereas sending resetToken in email
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  console.log(
    ` Email Reset Token: ${resetToken} \n Encrypt Reset Token DB: ${this.passwordResetToken}`
  );
  this.name = 'Michael';
  // password reset expires after 10 min (60000 milisecs)
  this.passwordResetExpires = Date.now() + 10 * 60 * 100;
  return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
