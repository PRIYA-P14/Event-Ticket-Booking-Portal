const express = require('express');

const authenticate = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');
const {
  createBooking,
  getMyBookings,
  getBookingById,
} = require('../controllers/bookingController');

const router = express.Router();

router.use(authenticate);
router.post('/', authorizeRoles('ATTENDEE'), createBooking);
router.get('/my-bookings', authorizeRoles('ATTENDEE'), getMyBookings);
router.get('/:bookingId', getBookingById);

module.exports = router;
