const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    organizerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    venueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Venue', required: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    startAt: { type: Date, required: true },
    seatLimit: { type: Number, required: true, min: 1 },
    ticketsBooked: { type: Number, default: 0, min: 0 },
    ticketPrice: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

eventSchema.pre('validate', function validateTicketCapacity() {
  if (this.ticketsBooked > this.seatLimit) {
    this.invalidate('ticketsBooked', 'ticketsBooked cannot exceed seatLimit');
  }
});

// Booking logic should use this atomic operation to prevent overbooking under concurrency.
eventSchema.statics.reserveTickets = function reserveTickets(eventId, quantity) {
  return this.findOneAndUpdate(
    {
      _id: eventId,
      isActive: true,
      $expr: { $lte: [{ $add: ['$ticketsBooked', quantity] }, '$seatLimit'] },
    },
    { $inc: { ticketsBooked: quantity } },
    { new: true, runValidators: true }
  );
};

module.exports = mongoose.model('Event', eventSchema);
