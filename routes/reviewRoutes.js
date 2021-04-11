const express = require('express');
const reviewController = require('../controllers/reviewController');
const authController = require('../controllers/authController');

// By default each router only has access of their specific routes
const router = express.Router({ mergeParams: true });

// Middleware to protect all routes that comes after it
router.use(authController.protect);

router
  .route('/')
  .get(reviewController.getAllReviews)
  .post(
    authController.restrictTo('user'),
    reviewController.setTourUserIds,
    reviewController.createReview
  );

router
  .route('/:id')
  .get(reviewController.getReview)
  .patch(
    authController.restrictTo('user', 'admin'),
    reviewController.updateReview
  )
  .delete(
    authController.restrictTo('user', 'admin'),
    reviewController.deleteReview
  );

module.exports = router;
