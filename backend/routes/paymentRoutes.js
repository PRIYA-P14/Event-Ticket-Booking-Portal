const express = require('express');

const authenticate = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');
const {
  createOrder,
  verifyPayment,
  getPaymentStatus,
} = require('../controllers/paymentController');

const router = express.Router();

router.use(authenticate, authorizeRoles('ATTENDEE'));
router.post('/create-order', createOrder);
router.post('/verify', verifyPayment);
router.get('/:bookingId', getPaymentStatus);

module.exports = router;
