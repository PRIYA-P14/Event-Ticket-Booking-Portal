const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    bookingReference: { type: String, required: true, unique: true, trim: true },
    attendeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    quantity: { type: Number, required: true, min: 1, max: 6 },
    totalPrice: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['PENDING_PAYMENT', 'BOOKED', 'CANCELLED', 'PAYMENT_FAILED', 'EXPIRED'],
      required: true,
    },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
    bookedAt: { type: Date },
    cancelledAt: { type: Date },
    expiresAt: { type: Date },
  },
  { timestamps: true }
);

bookingSchema.index(
  { attendeeId: 1, eventId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ['BOOKED', 'PENDING_PAYMENT'] } },
  }
);

module.exports = mongoose.model('Booking', bookingSchema);
