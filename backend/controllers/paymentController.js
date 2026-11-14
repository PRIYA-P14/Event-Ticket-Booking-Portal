const crypto = require('crypto');
const mongoose = require('mongoose');
const Razorpay = require('razorpay');

const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const PaymentWebhookEvent = require('../models/PaymentWebhookEvent');
const {
  createOrderSchema,
  paymentIdSchema,
  parseOrThrow,
  verifyPaymentSchema,
} = require('../validators/paymentValidator');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const activePaymentStatuses = ['CREATED', 'AUTHORIZED'];
const createHttpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const amountInPaise = (amountInRupees) => Math.round(amountInRupees * 100);

const safePayment = (payment) => {
  const item = payment.toObject ? payment.toObject() : payment;
  delete item.signature;
  delete item.__v;
  return item;
};

const paymentDetails = (payment) => ({
  bookingReference: payment.bookingId.bookingReference,
  amount: payment.amount,
  currency: payment.currency,
  status: payment.status,
  paymentDate: payment.updatedAt,
  provider: payment.provider,
});

const createOrder = async (req, res, next) => {
  try {
    const { bookingId } = parseOrThrow(createOrderSchema, req.body);
    const booking = await Booking.findOne({
      _id: bookingId,
      attendeeId: req.user._id,
    });
    if (!booking) throw createHttpError(404, 'Booking not found');
    if (booking.status !== 'PENDING_PAYMENT') {
      throw createHttpError(409, 'This booking is not awaiting payment');
    }

    const existingPayment = await Payment.findOne({
      _id: booking.paymentId,
      bookingId: booking._id,
      attendeeId: req.user._id,
      status: { $in: activePaymentStatuses },
    });
    if (existingPayment) {
      return res.json({
        success: true,
        message: 'Existing payment order returned',
        checkout: {
          key: process.env.RAZORPAY_KEY_ID,
          orderId: existingPayment.orderId,
          amount: existingPayment.amount,
          currency: existingPayment.currency,
          bookingId: booking._id,
          bookingReference: booking.bookingReference,
        },
      });
    }

    const amount = amountInPaise(booking.totalPrice);
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      throw createHttpError(400, 'Booking amount is invalid');
    }
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay credentials are not configured');
    }

    const order = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt: booking.bookingReference,
      notes: { bookingId: booking._id.toString() },
    });

    const session = await mongoose.startSession();
    let paymentForCheckout;
    try {
      await session.withTransaction(async () => {
        const currentBooking = await Booking.findOne({
          _id: booking._id,
          attendeeId: req.user._id,
          status: 'PENDING_PAYMENT',
        }).session(session);
        if (!currentBooking) throw createHttpError(409, 'Booking is no longer awaiting payment');

        const duplicateOrder = await Payment.findOne({ bookingId: booking._id, status: { $in: activePaymentStatuses } }).session(session);
        if (duplicateOrder) {
          paymentForCheckout = duplicateOrder;
          return;
        }

        const [payment] = await Payment.create(
          [{
            bookingId: booking._id,
            attendeeId: req.user._id,
            provider: 'RAZORPAY',
            orderId: order.id,
            amount,
            currency: 'INR',
            status: 'CREATED',
          }],
          { session }
        );
        paymentForCheckout = payment;
        currentBooking.paymentId = payment._id;
        await currentBooking.save({ session });
      });
    } finally {
      await session.endSession();
    }

    const storedPayment = paymentForCheckout || await Payment.findOne({ orderId: order.id });
    if (!storedPayment) {
      throw new Error('Payment order could not be stored');
    }
    return res.status(201).json({
      success: true,
      message: 'Razorpay order created',
      checkout: {
        key: process.env.RAZORPAY_KEY_ID,
        orderId: storedPayment.orderId,
        amount: storedPayment.amount,
        currency: storedPayment.currency,
        bookingId: booking._id,
        bookingReference: booking.bookingReference,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      error.statusCode = 409;
      error.message = 'A payment order already exists for this booking';
    }
    return next(error);
  }
};

const verifyPayment = async (req, res, next) => {
  try {
    const data = parseOrThrow(verifyPaymentSchema, req.body);
    const payment = await Payment.findOne({
      orderId: data.razorpay_order_id,
      attendeeId: req.user._id,
    });
    if (!payment) throw createHttpError(404, 'Payment order not found');
    const booking = await Booking.findOne({ _id: payment.bookingId, attendeeId: req.user._id });
    if (!booking) throw createHttpError(404, 'Booking not found');
    if (booking.status === 'BOOKED' && payment.paymentId === data.razorpay_payment_id) {
      return res.json({ success: true, message: 'Payment was already verified', booking, payment: safePayment(payment) });
    }
    if (booking.status !== 'PENDING_PAYMENT') {
      throw createHttpError(409, 'This booking is not awaiting payment');
    }
    if (payment.status === 'REFUNDED' || payment.status === 'FAILED') {
      throw createHttpError(409, 'This payment cannot be verified');
    }

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${payment.orderId}|${data.razorpay_payment_id}`)
      .digest('hex');
    if (
      expectedSignature.length !== data.razorpay_signature.length
      || !crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(data.razorpay_signature))
    ) {
      throw createHttpError(400, 'Invalid payment signature');
    }

    const providerPayment = await razorpay.payments.fetch(data.razorpay_payment_id);
    if (providerPayment.order_id !== payment.orderId || providerPayment.status !== 'captured') {
      throw createHttpError(409, 'Payment is not captured');
    }
    if (providerPayment.amount !== payment.amount || String(providerPayment.currency).toUpperCase() !== payment.currency) {
      throw createHttpError(409, 'Payment amount or currency does not match the booking');
    }

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const currentPayment = await Payment.findOne({ _id: payment._id, attendeeId: req.user._id }).session(session);
        const currentBooking = await Booking.findOne({ _id: booking._id, attendeeId: req.user._id }).session(session);
        if (!currentPayment || !currentBooking) throw createHttpError(404, 'Payment or booking not found');
        if (currentBooking.status === 'BOOKED') return;
        if (currentBooking.status !== 'PENDING_PAYMENT') throw createHttpError(409, 'Booking is no longer awaiting payment');
        currentPayment.paymentId = data.razorpay_payment_id;
        currentPayment.signature = data.razorpay_signature;
        currentPayment.status = 'CAPTURED';
        currentBooking.status = 'BOOKED';
        currentBooking.bookedAt = new Date();
        await currentPayment.save({ session });
        await currentBooking.save({ session });
      });
    } finally {
      await session.endSession();
    }

    const updatedPayment = await Payment.findById(payment._id).populate('bookingId', 'bookingReference');
    const updatedBooking = await Booking.findById(booking._id);
    return res.json({ success: true, message: 'Payment verified and booking confirmed', booking: updatedBooking, payment: safePayment(updatedPayment) });
  } catch (error) {
    return next(error);
  }
};

const getPaymentStatus = async (req, res, next) => {
  try {
    const { bookingId } = parseOrThrow(paymentIdSchema, req.params);
    const payment = await Payment.findOne({ bookingId, attendeeId: req.user._id }).populate('bookingId', 'bookingReference');
    if (!payment) throw createHttpError(404, 'Payment not found');
    return res.json({ success: true, payment: paymentDetails(payment) });
  } catch (error) {
    return next(error);
  }
};

const processWebhook = async (req, res, next) => {
  try {
    if (!process.env.RAZORPAY_WEBHOOK_SECRET) throw new Error('Razorpay webhook secret is not configured');
    const signature = req.get('x-razorpay-signature');
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from('');
    if (!signature) throw createHttpError(400, 'Webhook signature is required');
    const expected = crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest('hex');
    if (expected.length !== signature.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) {
      throw createHttpError(400, 'Invalid webhook signature');
    }

    const payload = JSON.parse(rawBody.toString('utf8'));
    const eventId = req.get('x-razorpay-event-id') || payload.id;
    if (!eventId) throw createHttpError(400, 'Webhook event ID is required');
    const webhook = await PaymentWebhookEvent.create({ eventId, event: payload.event || 'unknown' }).catch((error) => {
      if (error.code === 11000) return null;
      throw error;
    });
    if (!webhook) return res.json({ success: true, message: 'Webhook already processed' });

    const paymentData = payload.payload?.payment?.entity;
    const orderId = paymentData?.order_id || payload.payload?.order?.entity?.id;
    if (orderId) {
      const payment = await Payment.findOne({ orderId });
      if (payment) {
        if (payload.event === 'payment.captured' || payload.event === 'order.paid') {
          payment.paymentId = paymentData?.id || payment.paymentId;
          payment.status = 'CAPTURED';
          await payment.save();
        } else if (payload.event === 'payment.failed') {
          payment.paymentId = paymentData?.id || payment.paymentId;
          payment.status = 'FAILED';
          await payment.save();
        }
      }
    }
    return res.json({ success: true, message: 'Webhook processed' });
  } catch (error) {
    return next(error);
  }
};

module.exports = { createOrder, verifyPayment, getPaymentStatus, processWebhook, razorpay };
