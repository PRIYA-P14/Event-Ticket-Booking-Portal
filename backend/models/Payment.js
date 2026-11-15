const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    attendeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    provider: { type: String, enum: ['RAZORPAY', 'DEMO'], default: 'DEMO', required: true },
    orderId: { type: String, trim: true },
    paymentId: { type: String, trim: true },
    signature: { type: String, trim: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR', uppercase: true, trim: true },
    status: {
      type: String,
      enum: ['CREATED', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUND_PENDING', 'REFUNDED', 'SUCCESS', 'CANCELLED', 'NOT_APPLICABLE'],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['PENDING', 'SUCCESS', 'CANCELLED', 'NOT_APPLICABLE'],
    },
    paymentMethod: { type: String, enum: ['DEMO'] },
    paidAt: { type: Date },
    refundId: { type: String, trim: true },
    refundAmount: { type: Number, min: 0 },
    refundedAmount: { type: Number, default: 0, min: 0 },
    refundStatus: {
      type: String,
      enum: ['PENDING', 'PROCESSED', 'FAILED'],
    },
    refundInitiatedAt: { type: Date },
    refundCompletedAt: { type: Date },
    refundError: { type: String, trim: true, maxlength: 500 },
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
