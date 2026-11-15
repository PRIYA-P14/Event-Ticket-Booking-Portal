const mongoose = require('mongoose');

const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const {
  simulatePaymentSchema,
  paymentIdSchema,
  parseOrThrow,
} = require('../validators/paymentValidator');

const createHttpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const paymentDetails = (payment) => ({
  bookingReference: payment.bookingId.bookingReference,
  amount: payment.amount,
  currency: payment.currency,
  status: payment.paymentStatus || payment.status,
  paymentStatus: payment.paymentStatus || payment.status,
  paymentMethod: payment.paymentMethod || payment.provider,
  paymentDate: payment.paidAt || payment.updatedAt,
  provider: payment.provider,
});

const simulateSuccess = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const { bookingId } = parseOrThrow(simulatePaymentSchema, req.body);
    let completedPayment;
    let completedBooking;

    await session.withTransaction(async () => {
      const booking = await Booking.findOne({
        _id: bookingId,
        attendeeId: req.user._id,
      }).session(session);
      if (!booking) throw createHttpError(404, 'Booking not found');
      if (booking.status === 'BOOKED') {
        const existingPayment = await Payment.findOne({
          bookingId: booking._id,
          attendeeId: req.user._id,
          paymentStatus: 'SUCCESS',
        }).session(session);
        if (existingPayment) {
          completedPayment = existingPayment;
          completedBooking = booking;
          return;
        }
        throw createHttpError(409, 'Booking is already confirmed');
      }
      if (booking.status !== 'PENDING_PAYMENT') {
        throw createHttpError(409, 'Booking is not awaiting payment');
      }

      let payment = await Payment.findOne({
        bookingId: booking._id,
        attendeeId: req.user._id,
      }).session(session);
      if (payment?.paymentStatus === 'SUCCESS') {
        booking.status = 'BOOKED';
        booking.bookedAt = booking.bookedAt || new Date();
        await booking.save({ session });
        completedPayment = payment;
        completedBooking = booking;
        return;
      }

      if (!payment) {
        [payment] = await Payment.create([{
          bookingId: booking._id,
          attendeeId: req.user._id,
          provider: 'DEMO',
          amount: booking.totalPrice,
          currency: 'INR',
          status: 'SUCCESS',
          paymentStatus: 'SUCCESS',
          paymentMethod: 'DEMO',
          paidAt: new Date(),
        }], { session });
      } else {
        payment.provider = 'DEMO';
        payment.amount = booking.totalPrice;
        payment.currency = 'INR';
        payment.status = 'SUCCESS';
        payment.paymentStatus = 'SUCCESS';
        payment.paymentMethod = 'DEMO';
        payment.paidAt = new Date();
        await payment.save({ session });
      }

      booking.status = 'BOOKED';
      booking.bookedAt = new Date();
      booking.paymentId = payment._id;
      await booking.save({ session });
      completedPayment = payment;
      completedBooking = booking;
    });

    return res.status(200).json({
      success: true,
      message: 'Demo payment successful. No actual money was collected.',
      booking: {
        id: completedBooking._id,
        bookingReference: completedBooking.bookingReference,
        status: completedBooking.status,
      },
      payment: {
        amount: completedPayment.amount,
        currency: completedPayment.currency,
        paymentStatus: completedPayment.paymentStatus,
        paymentMethod: completedPayment.paymentMethod,
        paidAt: completedPayment.paidAt,
      },
    });
  } catch (error) {
    return next(error);
  } finally {
    await session.endSession();
  }
};

const getPaymentStatus = async (req, res, next) => {
  try {
    const { bookingId } = parseOrThrow(paymentIdSchema, req.params);
    const payment = await Payment.findOne({
      bookingId,
      attendeeId: req.user._id,
    }).populate('bookingId', 'bookingReference');
    if (!payment) throw createHttpError(404, 'Payment not found');
    return res.json({ success: true, payment: paymentDetails(payment) });
  } catch (error) {
    return next(error);
  }
};

const getRefundStatus = async (req, res, next) => {
  try {
    const { bookingId } = parseOrThrow(
      paymentIdSchema,
      req.params.bookingId ? req.params : req.query
    );
    const payment = await Payment.findOne({
      bookingId,
      attendeeId: req.user._id,
    }).populate('bookingId', 'bookingReference');
    if (!payment) throw createHttpError(404, 'Payment not found');
    return res.json({
      success: true,
      refund: {
        bookingReference: payment.bookingId.bookingReference,
        refundAmount: 0,
        refundId: null,
        refundStatus: 'NOT_APPLICABLE',
        message: 'Demo payments do not collect real money and do not require refunds.',
      },
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = { simulateSuccess, getPaymentStatus, getRefundStatus };
