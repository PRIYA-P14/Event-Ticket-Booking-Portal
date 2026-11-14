const { z } = require('zod');

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'A valid MongoDB ObjectId is required');

const createOrderSchema = z.object({ bookingId: objectId }).strict();

const verifyPaymentSchema = z
  .object({
    razorpay_order_id: z.string().trim().min(1).max(100),
    razorpay_payment_id: z.string().trim().min(1).max(100),
    razorpay_signature: z.string().trim().min(1).max(256),
  })
  .strict();

const paymentIdSchema = z.object({ bookingId: objectId });

const parseOrThrow = (schema, input) => {
  const result = schema.safeParse(input);
  if (!result.success) {
    const error = new Error(result.error.issues.map((issue) => issue.message).join(', '));
    error.statusCode = 400;
    throw error;
  }
  return result.data;
};

module.exports = {
  createOrderSchema,
  verifyPaymentSchema,
  paymentIdSchema,
  parseOrThrow,
};
