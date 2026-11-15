const { z } = require('zod');

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'A valid MongoDB ObjectId is required');

const simulatePaymentSchema = z.object({ bookingId: objectId }).strict();

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
  simulatePaymentSchema,
  paymentIdSchema,
  parseOrThrow,
};
