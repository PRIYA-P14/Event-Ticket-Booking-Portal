const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    attendeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    provider: { type: String, enum: ['RAZORPAY'], default: 'RAZORPAY', required: true },
    orderId: { type: String, trim: true },
    paymentId: { type: String, trim: true },
    signature: { type: String, trim: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR', uppercase: true, trim: true },
    status: {
      type: String,
      enum: ['CREATED', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUND_PENDING', 'REFUNDED'],
      required: true,
    },
    refundId: { type: String, trim: true },
    refundedAmount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

paymentSchema.index(
  { orderId: 1 },
  { unique: true, partialFilterExpression: { orderId: { $type: 'string' } } }
);
paymentSchema.index(
  { paymentId: 1 },
  { unique: true, partialFilterExpression: { paymentId: { $type: 'string' } } }
);

module.exports = mongoose.model('Payment', paymentSchema);
