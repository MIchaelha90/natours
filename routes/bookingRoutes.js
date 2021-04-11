const express = require('express');
const bookingController = require('../controllers/bookingController.js');
const authController = require('../controllers/authController');

// By default each router only has access of their specific routes
const router = express.Router();

router.use(authController.protect);

// doesnt follow REST principles
router.get('/checkout-session/:tourId', bookingController.getCheckoutSession);

router.use(authController.restrictTo('admin', 'lead-guide'));

router
  .route('/')
  .get(bookingController.getAllBookings)
  .post(bookingController.createBooking);

router
  .route('/:id')
  .get(bookingController.getBooking)
  .patch(bookingController.updateBooking)
  .delete(bookingController.deleteBooking);

module.exports = router;
