const mongoose = require('mongoose');

const Booking = require('../models/Booking');
const Counter = require('../models/Counter');
const Event = require('../models/Event');
const Payment = require('../models/Payment');
const {
  bookingIdSchema,
  createBookingSchema,
  paginationSchema,
  parseOrThrow,
} = require('../validators/bookingValidator');

const activeStatuses = ['BOOKED', 'PENDING_PAYMENT'];

const createHttpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const formatDatePart = (date) => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}${month}${day}`;
};

const safeBooking = (booking) => {
  const item = booking.toObject ? booking.toObject() : booking;
  return item;
};

const populateBooking = (query) =>
  query.populate({
    path: 'eventId',
    select: 'title startAt ticketPrice venueId',
    populate: {
      path: 'venueId',
      select: 'name address capacity',
    },
  });

const createBooking = async (req, res, next) => {
  let session;

  try {
    const { eventId, quantity } = parseOrThrow(createBookingSchema, req.body);
    session = await mongoose.startSession();
    let createdBooking;

    await session.withTransaction(async () => {
      const event = await Event.findById(eventId).session(session);
      if (!event) {
        throw createHttpError(404, 'Event not found');
      }
      if (!event.isActive) {
        throw createHttpError(409, 'Event is inactive');
      }
      if (event.startAt <= new Date()) {
        throw createHttpError(409, 'Event has already started or ended');
      }

      const existingBooking = await Booking.findOne({
        attendeeId: req.user._id,
        eventId,
        status: { $in: activeStatuses },
      }).session(session);
      if (existingBooking) {
        throw createHttpError(409, 'You already have an active booking for this event');
      }

      const reservedEvent = await Event.findOneAndUpdate(
        {
          _id: eventId,
          isActive: true,
          startAt: { $gt: new Date() },
          $expr: { $lte: [{ $add: ['$ticketsBooked', quantity] }, '$seatLimit'] },
        },
        { $inc: { ticketsBooked: quantity } },
        { returnDocument: 'after', session, runValidators: true }
      );

      if (!reservedEvent) {
        throw createHttpError(409, 'Insufficient seats available for this event');
      }

      const datePart = formatDatePart(new Date());
      const counter = await Counter.findOneAndUpdate(
        { _id: `booking-${datePart}` },
        { $inc: { sequence: 1 } },
        {
          upsert: true,
          returnDocument: 'after',
          setDefaultsOnInsert: true,
          session,
        }
      );
      const bookingReference = `EVT-${datePart}-${String(counter.sequence).padStart(4, '0')}`;

      const [booking] = await Booking.create(
        [
          {
            bookingReference,
            attendeeId: req.user._id,
            eventId,
            quantity,
            totalPrice: reservedEvent.ticketPrice * quantity,
            status: 'PENDING_PAYMENT',
          },
        ],
        { session }
      );
      createdBooking = booking;
    });

    const populatedBooking = await populateBooking(
      Booking.findById(createdBooking._id)
    );
    return res.status(201).json({
      success: true,
      message: 'Booking created and seats reserved pending payment',
      booking: safeBooking(populatedBooking),
    });
  } catch (error) {
    if (error.code === 11000) {
      error.statusCode = 409;
      error.message = error.keyPattern?.bookingReference
        ? 'Unable to generate a unique booking reference'
        : 'You already have an active booking for this event';
    }
    return next(error);
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};

const getMyBookings = async (req, res, next) => {
  try {
    const { page, limit } = parseOrThrow(paginationSchema, req.query);
    const filter = { attendeeId: req.user._id };
    const [bookings, total] = await Promise.all([
      populateBooking(
        Booking.find(filter)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
      ),
      Booking.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      bookings: bookings.map(safeBooking),
    });
  } catch (error) {
    return next(error);
  }
};

const getBookingById = async (req, res, next) => {
  try {
    const { bookingId } = parseOrThrow(bookingIdSchema, req.params);
    const booking = await populateBooking(
      Booking.findOne({ _id: bookingId, attendeeId: req.user._id })
    );
    if (!booking) {
      throw createHttpError(404, 'Booking not found');
    }

    return res.json({ success: true, booking: safeBooking(booking) });
  } catch (error) {
    return next(error);
  }
};

const cancelBooking = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const { bookingId } = parseOrThrow(bookingIdSchema, req.params);
    let cancelledBooking;
    await session.withTransaction(async () => {
      const currentBooking = await Booking.findOne({
        _id: bookingId,
        attendeeId: req.user._id,
        status: { $in: activeStatuses },
      }).session(session);
      if (!currentBooking) {
        const existingBooking = await Booking.findOne({ _id: bookingId, attendeeId: req.user._id }).session(session);
        if (!existingBooking) throw createHttpError(404, 'Booking not found');
        if (existingBooking.status === 'CANCELLED') throw createHttpError(409, 'Booking is already cancelled');
        throw createHttpError(409, `Booking with status ${existingBooking.status} cannot be cancelled`);
      }
      const event = await Event.findOne({ _id: currentBooking.eventId }).session(session);
      if (!event) throw createHttpError(404, 'Event not found');
      if (event.startAt <= new Date()) {
        throw createHttpError(409, 'Bookings cannot be cancelled after the event starts');
      }

      const releasedEvent = await Event.findOneAndUpdate(
        {
          _id: currentBooking.eventId,
          $expr: { $gte: ['$ticketsBooked', currentBooking.quantity] },
        },
        { $inc: { ticketsBooked: -currentBooking.quantity } },
        { returnDocument: 'after', session, runValidators: true }
      );
      if (!releasedEvent) {
        throw createHttpError(409, 'Unable to release the reserved seats safely');
      }

      currentBooking.status = 'CANCELLED';
      currentBooking.cancelledAt = new Date();
      await currentBooking.save({ session });
      if (currentBooking.paymentId) {
        await Payment.updateOne(
          { _id: currentBooking.paymentId, bookingId, attendeeId: req.user._id },
          {
            $set: {
              provider: 'DEMO',
              status: 'CANCELLED',
              paymentStatus: 'CANCELLED',
              paymentMethod: 'DEMO',
            },
            $unset: {
              refundId: 1,
              refundAmount: 1,
              refundedAmount: 1,
              refundStatus: 1,
              refundInitiatedAt: 1,
              refundCompletedAt: 1,
              refundError: 1,
            },
          },
          { session }
        );
      }
      cancelledBooking = currentBooking;
    });
    console.info(`Demo booking ${cancelledBooking.bookingReference} cancelled and seats released`);
    return res.json({
      success: true,
      message: 'Booking cancelled. Demo payments do not require refunds.',
      booking: cancelledBooking,
    });
  } catch (error) {
    return next(error);
  } finally {
    await session.endSession();
  }
};

module.exports = { createBooking, getMyBookings, getBookingById, cancelBooking };
