const mongoose = require('mongoose');

const paymentWebhookEventSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, unique: true, trim: true },
    event: { type: String, required: true, trim: true },
    processedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PaymentWebhookEvent', paymentWebhookEventSchema);
