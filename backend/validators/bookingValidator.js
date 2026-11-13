const { z } = require('zod');

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'A valid MongoDB ObjectId is required');

const createBookingSchema = z
  .object({
    eventId: objectId,
    quantity: z.coerce.number().int().min(1).max(6),
  })
  .strict();

const bookingIdSchema = z.object({ bookingId: objectId });

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

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
  createBookingSchema,
  bookingIdSchema,
  paginationSchema,
  parseOrThrow,
};
