// review / rating / createdAt // ref to tour / ref to user
const mongoose = require('mongoose');
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Review can not be empty'],
    },
    rating: {
      type: Number,
      min: [1, 'the review rating must be minimum 1'],
      max: [5, 'the review ratings must be maximum 5'],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user'],
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a tour'],
    },
  },
  {
    // Virtual property, a field that is not stored in the in database, but
    // calculated using other values. We want that show up in the JSON Response out.
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

reviewSchema.pre(/^find/, function (next) {
  // this.populate({
  //   path: 'tour',
  //   select: '-guides name',
  // }).populate({
  //   path: 'user',
  //   select: 'name photo', // we don't want to leak all the emails
  // });

  this.populate({
    path: 'user',
    select: 'name photo', // we don't want to leak all the emails
  });
  next();
});

reviewSchema.statics.calcAverageRatings = async function (tourId) {
  // this keyword points to current model
  const stats = await this.aggregate([
    {
      $match: { tour: tourId },
    },
    {
      $group: {
        _id: '$tour',
        nRatings: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
  ]);
  console.log(stats);

  // persist into the stats into the database
  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRatings,
      ratingsAverage: stats[0].avgRating,
    });
  } else {
    // set default value
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5,
    });
  }
};

// don't use pre as review is not in the collection yet, and we can't do calculations
// on data that is not in the DB yet.
reviewSchema.post('save', function () {
  // this keyword points to current document, and the constructor
  // is the model (Review) that created the document
  this.constructor.calcAverageRatings(this.tour);
});

// findByIdAndUpdate & findByIdAndDelete
// pre() so we have acess to the query. this.r to pass it on to post.
reviewSchema.pre(/^findOneAnd/, async function (next) {
  this.r = await this.findOne();
  console.log(this.r);
  next();
});

//  persist it to the DB. post() the query has already been exevuted
//- this.r = await this.findOne(); does not work here
reviewSchema.post(/^findOneAnd/, async function () {
  await this.r.constructor.calcAverageRatings(this.r.tour);
});

module.exports = mongoose.model('Review', reviewSchema);
