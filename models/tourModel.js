const mongoose = require('mongoose');
const slugify = require('slugify');
const validator = require('validator');
//const User = require('./userModel');

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      unique: true,
      trim: true,
      maxlength: [40, 'A tour name must have less or equal than 40 characters'],
      minlength: [10, 'A tour name must have more or equal than 10 characters'],
      //validate: [validator.isAlpha, 'Tour name must only contain characters'],
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a group size'],
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty'],
      enum: {
        // only for strings
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficulty is either: easy. medium, difficult',
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'A tour must have a rating above 1.0'],
      max: [5, 'A tour must have a rating below 5.0'],
      set: (val) => Math.round(val * 10) / 10,
      // it round to integers4.6666 -> 46.666 -> 47 -> 4.7
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price'],
    },
    priceDiscount: {
      type: Number,
      validate: {
        // custom validator.
        validator: function (value) {
          // Important! : The this keyword only points to current document
          // when creating a new document, not gonna work on update
          return value < this.price;
        },
        message: 'Discount price ({VALUE}) should be below the regular price',
      },
    },
    summary: {
      type: String,
      trim: true,
      required: [true, 'A tour must have a summary'],
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have a cover image'],
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false,
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false,
    },
    startLocation: {
      // GeoJSON
      type: {
        type: String,
        default: 'Point',
        enum: ['Point'],
      },
      coordinates: [Number], // expect an array of numbers
      address: String,
      description: String,
    },
    locations: [
      // this how you create embedded documents with array
      {
        type: {
          type: String,
          default: 'point',
          enum: ['Point'],
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number,
      },
    ],
    guides: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    // Virtual property, a field that is not stored in the in database, but
    // calculated using other values. We want that show up in the JSON Response out.
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

///---------------------- indexes -----------------------------
tourSchema.index({ price: 1, ratingsAverage: -1 });
tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: '2dsphere' });

///---------------------- Virtual Fields -----------------------------
// Virtual properties are non-persitent, so they wont be saved in our database.
// This means also means that we cannot use them in a query
// the virtual property will be create each time we get something
tourSchema.virtual('durationWeeks').get(function () {
  return this.duration / 7;
});

// virtual populate
tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour', //name of the field in the other/foreign model (review), where the reference to the current model is stored.
  localField: '_id', // where the Id is stored in the current/local tour model.  Connect the two models
});

///---------------------- Pre Hooks -----------------------------

// DOCUMENT MIDDLEWARE: runs before .save and .create() monoose functions. called a pre-save hook/middleware
tourSchema.pre('save', function (next) {
  this.slug = slugify(this.name, { lower: true }); // this points to the currently saved document
  next();
});

// tourSchema.pre('save', async function (next) {
//   const idsArray = this.guides;
//   // $in select any documents that in contain any of value(s) as in the idsArray
//   //we only make one query call compared to solution in lesson 150 where we make query call per guide
//   this.guides = await User.find({ _id: { $in: idsArray } });
//   next();
// });

// tourSchema.pre('save', async function (next) {
//   const guidePromises = this.guides.map(async (id) => await User.findById(id));
//   this.guides = await Promise.all(guidePromises);
//   next();
// });

// tourSchema.pre('save', function (next) {
//   console.log('Will save document...');
//   next();
// });

// tourSchema.post('save', function (doc, next) {
//   console.log(doc);
//   next();
// });

// QUERY MIDDLEWARE - runs before any type of find() method
// We use regular expression here - all the string that starts with find.
tourSchema.pre(/^find/, function (next) {
  // this now a query object, which means we chain query methods to it.
  // Here we chain another find() to filter secret tours out
  this.find({ secretTour: { $ne: true } });

  // just regular object, so we can add a property to it
  this.start = Date.now();
  next();
});

// populate query middleware
tourSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangedAt',
  });
  next();
});

// AGGREGATE MIDDLEWARE - hide secret tour
// tourSchema.pre('aggregate', function (next) {
//   // unshift() is a standard javascript method for putting an object infront of the array
//   this.pipeline().unshift({
//     $match: { secretTour: { $ne: true } },
//   });

//   console.log(this.pipeline());
//   next();
// });

// we have access to the docs like last time, since the query has returned
tourSchema.post(/^find/, function (docs, next) {
  console.log(`Query took ${Date.now() - this.start} miliseconds `);
  next();
});

const Tour = mongoose.model('Tour', tourSchema); // (modelName, schema)

module.exports = Tour;
