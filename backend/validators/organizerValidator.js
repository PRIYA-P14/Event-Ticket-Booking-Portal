const { z } = require('zod');

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'A valid event ID is required');

const attendeeQuerySchema = z.object({
  status: z.enum(['BOOKED', 'PENDING_PAYMENT', 'CANCELLED', 'PAYMENT_FAILED', 'EXPIRED']).default('BOOKED'),
  search: z.string().trim().max(100).optional(),
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
  eventIdSchema: z.object({ eventId: objectId }),
  attendeeQuerySchema,
  parseOrThrow,
};
