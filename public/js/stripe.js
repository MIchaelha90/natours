/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alert';

const stripe = Stripe(
  'pk_test_51Ic6TdICIQXz2ksD32kSpXRzlmV9d6tZ7ijsS0lADMAO3zDxOt4SJVRUIeG0J81ZMDICDPLVZKF2zkjPvkVu04fE00kT1iqhnF'
);

export const bookTour = async (tourId) => {
  console.log(tourId);
  try {
    // 1) get the checkout session from API
    console.log('axios call....');
    const session = await axios(`/api/v1/bookings/checkout-session/${tourId}`);
    console.log(session);

    // 2) Create checkout form + charge credit card
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id,
    });
  } catch (err) {
    console.log(err);
    showAlert('error', err);
  }
};
