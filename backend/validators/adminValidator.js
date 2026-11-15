const { z } = require('zod');

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'A valid MongoDB ObjectId is required');
const password = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/\d/, 'Password must contain a number');

const organizerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email(),
  phone: z.string().trim().min(10).max(16),
  password,
}).strict();

const idSchema = z.object({ id: objectId });
const venueSchema = z.object({
  name: z.string().trim().min(1).max(200),
  address: z.string().trim().min(1).max(500),
  capacity: z.coerce.number().int().min(1),
}).strict();
const categorySchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).optional().default(''),
}).strict();
const statusSchema = z.object({ isActive: z.boolean() }).strict();
const bookingQuerySchema = z.object({
  eventId: objectId.optional(),
  status: z.enum(['PENDING_PAYMENT', 'BOOKED', 'CANCELLED', 'PAYMENT_FAILED', 'EXPIRED']).optional(),
  search: z.string().trim().max(100).optional(),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
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
  organizerSchema,
  idSchema,
  venueSchema,
  categorySchema,
  statusSchema,
  bookingQuerySchema,
  parseOrThrow,
};
