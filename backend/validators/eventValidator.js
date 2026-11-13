const { z } = require('zod');

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'A valid MongoDB ObjectId is required');
const futureDate = z.coerce.date().refine((value) => value > new Date(), {
  message: 'startAt must be a future date',
});

const createEventSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(5000).optional().default(''),
    organizerId: objectId,
    venueId: objectId,
    categoryId: objectId,
    startAt: futureDate,
    seatLimit: z.coerce.number().int().min(1),
    ticketPrice: z.coerce.number().finite().min(0),
  })
  .strict();

const updateEventSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(5000).optional(),
    organizerId: objectId.optional(),
    venueId: objectId.optional(),
    categoryId: objectId.optional(),
    startAt: futureDate.optional(),
    seatLimit: z.coerce.number().int().min(1).optional(),
    ticketPrice: z.coerce.number().finite().min(0).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one event field is required',
  });

const eventIdSchema = z.object({ eventId: objectId });

const listEventsQuerySchema = z.object({
  title: z.string().trim().max(200).optional(),
  categoryId: objectId.optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must use YYYY-MM-DD format')
    .optional(),
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
  createEventSchema,
  updateEventSchema,
  eventIdSchema,
  listEventsQuerySchema,
  parseOrThrow,
};
