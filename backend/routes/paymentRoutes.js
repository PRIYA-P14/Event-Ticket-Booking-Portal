const express = require('express');

const authenticate = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');
const {
  simulateSuccess,
  getPaymentStatus,
  getRefundStatus,
} = require('../controllers/paymentController');

const router = express.Router();

router.use(authenticate, authorizeRoles('ATTENDEE'));
router.post('/simulate-success', simulateSuccess);
router.get('/refund', getRefundStatus);
router.get('/refund/:bookingId', getRefundStatus);
router.get('/:bookingId', getPaymentStatus);

module.exports = router;
