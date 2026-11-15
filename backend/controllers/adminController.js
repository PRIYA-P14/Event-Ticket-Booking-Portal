const bcrypt = require('bcryptjs');

const Booking = require('../models/Booking');
const Category = require('../models/Category');
const Event = require('../models/Event');
const User = require('../models/User');
const Venue = require('../models/Venue');
const {
  bookingQuerySchema,
  categorySchema,
  idSchema,
  organizerSchema,
  parseOrThrow,
  statusSchema,
  venueSchema,
} = require('../validators/adminValidator');

const safeOrganizer = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  isActive: user.isActive,
  createdAt: user.createdAt,
});

const createHttpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const getDashboard = async (req, res, next) => {
  try {
    const [attendees, organizers, activeEvents, bookings, bookingGroups] = await Promise.all([
      User.countDocuments({ role: 'ATTENDEE' }),
      User.countDocuments({ role: 'ORGANIZER' }),
      Event.countDocuments({ isActive: true }),
      Booking.countDocuments(),
      Booking.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);
    const counts = Object.fromEntries(bookingGroups.map((item) => [item._id, item.count]));
    return res.json({
      success: true,
      stats: {
        totalAttendees: attendees,
        totalOrganizers: organizers,
        totalActiveEvents: activeEvents,
        totalBookings: bookings,
        confirmedBookings: counts.BOOKED || 0,
        cancelledBookings: counts.CANCELLED || 0,
        pendingPaymentBookings: counts.PENDING_PAYMENT || 0,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const listOrganizers = async (req, res, next) => {
  try {
    const search = String(req.query.search || '').trim();
    const filter = { role: 'ORGANIZER' };
    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ name: regex }, { email: regex }];
    }
    const organizers = await User.find(filter).select('name email phone role isActive createdAt').sort({ createdAt: -1 });
    return res.json({ success: true, organizers: organizers.map(safeOrganizer) });
  } catch (error) {
    return next(error);
  }
};

const createOrganizer = async (req, res, next) => {
  try {
    const data = parseOrThrow(organizerSchema, req.body);
    const existing = await User.exists({ email: data.email });
    if (existing) throw createHttpError(409, 'An account with this email already exists');
    const { password, ...profile } = data;
    const passwordHash = await bcrypt.hash(password, 12);
    const organizer = await User.create({ ...profile, passwordHash, role: 'ORGANIZER' });
    return res.status(201).json({ success: true, message: 'Organizer created successfully', organizer: safeOrganizer(organizer) });
  } catch (error) {
    return next(error);
  }
};

const setOrganizerStatus = async (req, res, next) => {
  try {
    const { id } = parseOrThrow(idSchema, req.params);
    const organizer = await User.findOneAndUpdate(
      { _id: id, role: 'ORGANIZER' },
      parseOrThrow(statusSchema, req.body),
      { returnDocument: 'after', runValidators: true }
    ).select('name email phone role isActive createdAt');
    if (!organizer) throw createHttpError(404, 'Organizer not found');
    return res.json({ success: true, organizer: safeOrganizer(organizer) });
  } catch (error) {
    return next(error);
  }
};

const listVenues = async (req, res, next) => {
  try {
    const venues = await Venue.find().sort({ name: 1 });
    return res.json({ success: true, venues });
  } catch (error) {
    return next(error);
  }
};

const createVenue = async (req, res, next) => {
  try {
    const venue = await Venue.create(parseOrThrow(venueSchema, req.body));
    return res.status(201).json({ success: true, venue });
  } catch (error) {
    return next(error);
  }
};

const updateVenue = async (req, res, next) => {
  try {
    const { id } = parseOrThrow(idSchema, req.params);
    const data = parseOrThrow(venueSchema, req.body);
    const venue = await Venue.findById(id);
    if (!venue) throw createHttpError(404, 'Venue not found');
    if (data.capacity < venue.capacity) {
      const conflictingEvent = await Event.exists({ venueId: id, seatLimit: { $gt: data.capacity } });
      if (conflictingEvent) throw createHttpError(409, 'Capacity cannot be lower than an existing event seat limit');
    }
    Object.assign(venue, data);
    await venue.save();
    return res.json({ success: true, venue });
  } catch (error) {
    return next(error);
  }
};

const setVenueStatus = async (req, res, next) => {
  try {
    const { id } = parseOrThrow(idSchema, req.params);
    const venue = await Venue.findByIdAndUpdate(id, parseOrThrow(statusSchema, req.body), { returnDocument: 'after' });
    if (!venue) throw createHttpError(404, 'Venue not found');
    return res.json({ success: true, venue });
  } catch (error) {
    return next(error);
  }
};

const listCategories = async (req, res, next) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    return res.json({ success: true, categories });
  } catch (error) {
    return next(error);
  }
};

const createCategory = async (req, res, next) => {
  try {
    const category = await Category.create(parseOrThrow(categorySchema, req.body));
    return res.status(201).json({ success: true, category });
  } catch (error) {
    return next(error);
  }
};

const updateCategory = async (req, res, next) => {
  try {
    const { id } = parseOrThrow(idSchema, req.params);
    const category = await Category.findByIdAndUpdate(id, parseOrThrow(categorySchema, req.body), {
      returnDocument: 'after',
      runValidators: true,
    });
    if (!category) throw createHttpError(404, 'Category not found');
    return res.json({ success: true, category });
  } catch (error) {
    return next(error);
  }
};

const setCategoryStatus = async (req, res, next) => {
  try {
    const { id } = parseOrThrow(idSchema, req.params);
    const category = await Category.findByIdAndUpdate(id, parseOrThrow(statusSchema, req.body), { returnDocument: 'after' });
    if (!category) throw createHttpError(404, 'Category not found');
    return res.json({ success: true, category });
  } catch (error) {
    return next(error);
  }
};

const listBookings = async (req, res, next) => {
  try {
    const query = parseOrThrow(bookingQuerySchema, req.query);
    const match = {};
    if (query.eventId) match.eventId = query.eventId;
    if (query.status) match.status = query.status;
    if (query.from || query.to) {
      match.createdAt = {};
      if (query.from) match.createdAt.$gte = new Date(`${query.from}T00:00:00.000Z`);
      if (query.to) {
        const endDate = new Date(`${query.to}T00:00:00.000Z`);
        endDate.setUTCDate(endDate.getUTCDate() + 1);
        match.createdAt.$lt = endDate;
      }
    }
    const pipeline = [
      { $match: match },
      { $lookup: { from: 'users', localField: 'attendeeId', foreignField: '_id', as: 'attendee' } },
      { $lookup: { from: 'events', localField: 'eventId', foreignField: '_id', as: 'event' } },
      { $lookup: { from: 'payments', localField: 'paymentId', foreignField: '_id', as: 'payment' } },
      { $unwind: '$attendee' },
      { $unwind: '$event' },
    ];
    if (query.search) {
      const regex = { $regex: query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
      pipeline.push({ $match: { bookingReference: regex } });
    }
    pipeline.push({
      $facet: {
        metadata: [{ $count: 'total' }],
        bookings: [
          { $sort: { createdAt: -1 } },
          { $skip: (query.page - 1) * query.limit },
          { $limit: query.limit },
          {
            $project: {
              _id: 1, bookingReference: 1, quantity: 1, totalPrice: 1, status: 1, createdAt: 1,
              attendee: { name: '$attendee.name', email: '$attendee.email' },
              event: { title: '$event.title' },
              paymentStatus: { $ifNull: [{ $arrayElemAt: ['$payment.paymentStatus', 0] }, { $arrayElemAt: ['$payment.status', 0] }] },
            },
          },
        ],
      },
    });
    const [result] = await Booking.aggregate(pipeline);
    const total = result?.metadata[0]?.total || 0;
    return res.json({
      success: true,
      pagination: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) },
      bookings: result?.bookings || [],
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getDashboard, listOrganizers, createOrganizer, setOrganizerStatus,
  listVenues, createVenue, updateVenue, setVenueStatus,
  listCategories, createCategory, updateCategory, setCategoryStatus,
  listBookings,
};
