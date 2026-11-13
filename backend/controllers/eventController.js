const mongoose = require('mongoose');

const Category = require('../models/Category');
const Event = require('../models/Event');
const User = require('../models/User');
const Venue = require('../models/Venue');
const {
  createEventSchema,
  updateEventSchema,
  eventIdSchema,
  listEventsQuerySchema,
  parseOrThrow,
} = require('../validators/eventValidator');

const organizerFields = 'name email role';
const venueFields = 'name address capacity isActive';
const categoryFields = 'name description isActive';

const addSeatsLeft = (event) => {
  const item = event.toObject ? event.toObject() : event;
  return { ...item, seatsLeft: item.seatLimit - item.ticketsBooked };
};

const getByIdOrThrow = async (Model, id, label, options = {}) => {
  const query = Model.findById(id);
  if (options.select) query.select(options.select);
  const document = await query;
  if (!document) {
    const error = new Error(`${label} not found`);
    error.statusCode = 404;
    throw error;
  }
  return document;
};

const validateReferences = async ({ organizerId, venueId, categoryId }) => {
  const [organizer, venue, category] = await Promise.all([
    getByIdOrThrow(User, organizerId, 'Organizer'),
    getByIdOrThrow(Venue, venueId, 'Venue'),
    getByIdOrThrow(Category, categoryId, 'Category'),
  ]);

  if (organizer.role !== 'ORGANIZER' || !organizer.isActive) {
    const error = new Error('organizerId must reference an active ORGANIZER');
    error.statusCode = 400;
    throw error;
  }
  if (!venue.isActive) {
    const error = new Error('venueId must reference an active venue');
    error.statusCode = 400;
    throw error;
  }
  if (!category.isActive) {
    const error = new Error('categoryId must reference an active category');
    error.statusCode = 400;
    throw error;
  }

  return { organizer, venue, category };
};

const populateEvent = (query) =>
  query
    .populate('organizerId', organizerFields)
    .populate('venueId', venueFields)
    .populate('categoryId', categoryFields);

const populatePublicEvent = (query) =>
  query
    .populate('organizerId', 'name')
    .populate('venueId', 'name address capacity')
    .populate('categoryId', 'name description');

const createEvent = async (req, res, next) => {
  try {
    const data = parseOrThrow(createEventSchema, req.body);
    const { venue } = await validateReferences(data);

    if (data.seatLimit > venue.capacity) {
      const error = new Error('seatLimit cannot exceed venue capacity');
      error.statusCode = 400;
      throw error;
    }

    const event = await Event.create({ ...data, ticketsBooked: 0, isActive: true });
    const populatedEvent = await populateEvent(Event.findById(event._id));
    return res.status(201).json({ success: true, message: 'Event created successfully', event: addSeatsLeft(populatedEvent) });
  } catch (error) {
    return next(error);
  }
};

const getAdminEvents = async (req, res, next) => {
  try {
    const events = await populateEvent(Event.find().sort({ startAt: 1 }));
    return res.json({ success: true, count: events.length, events: events.map(addSeatsLeft) });
  } catch (error) {
    return next(error);
  }
};

const updateEvent = async (req, res, next) => {
  try {
    const { eventId } = parseOrThrow(eventIdSchema, req.params);
    if (!mongoose.isValidObjectId(eventId)) {
      const error = new Error('A valid event ID is required');
      error.statusCode = 400;
      throw error;
    }

    const data = parseOrThrow(updateEventSchema, req.body);
    const event = await getByIdOrThrow(Event, eventId, 'Event');
    const referenceData = {
      organizerId: data.organizerId || event.organizerId,
      venueId: data.venueId || event.venueId,
      categoryId: data.categoryId || event.categoryId,
    };
    const { venue } = await validateReferences(referenceData);
    const seatLimit = data.seatLimit === undefined ? event.seatLimit : data.seatLimit;

    if (seatLimit < event.ticketsBooked) {
      const error = new Error('seatLimit cannot be lower than tickets already booked');
      error.statusCode = 400;
      throw error;
    }
    if (seatLimit > venue.capacity) {
      const error = new Error('seatLimit cannot exceed venue capacity');
      error.statusCode = 400;
      throw error;
    }

    const update = { ...data, seatLimit };
    delete update.ticketsBooked;
    const updatedEvent = await Event.findByIdAndUpdate(eventId, update, {
      returnDocument: 'after',
      runValidators: true,
    });
    const populatedEvent = await populateEvent(Event.findById(updatedEvent._id));
    return res.json({ success: true, message: 'Event updated successfully', event: addSeatsLeft(populatedEvent) });
  } catch (error) {
    return next(error);
  }
};

const deactivateEvent = async (req, res, next) => {
  try {
    const { eventId } = parseOrThrow(eventIdSchema, req.params);
    const event = await Event.findByIdAndUpdate(
      eventId,
      { isActive: false },
      { returnDocument: 'after', runValidators: true }
    );
    if (!event) {
      const error = new Error('Event not found');
      error.statusCode = 404;
      throw error;
    }
    return res.json({ success: true, message: 'Event deactivated successfully', event: addSeatsLeft(event) });
  } catch (error) {
    return next(error);
  }
};

const listPublicEvents = async (req, res, next) => {
  try {
    const query = parseOrThrow(listEventsQuerySchema, req.query);
    const now = new Date();
    const filter = { isActive: true, startAt: { $gt: now } };

    if (query.title) filter.title = { $regex: query.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    if (query.categoryId) filter.categoryId = query.categoryId;
    if (query.date) {
      const startOfDay = new Date(`${query.date}T00:00:00.000Z`);
      const endOfDay = new Date(startOfDay);
      endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);
      if (Number.isNaN(startOfDay.getTime())) {
        const error = new Error('date must be a valid calendar date');
        error.statusCode = 400;
        throw error;
      }
      filter.startAt = { $gte: startOfDay, $lt: endOfDay, $gt: now };
    }

    const skip = (query.page - 1) * query.limit;
    const [events, total] = await Promise.all([
      populateEvent(Event.find(filter).sort({ startAt: 1 }).skip(skip).limit(query.limit)),
      Event.countDocuments(filter),
    ]);
    return res.json({
      success: true,
      pagination: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) },
      events: events.map(addSeatsLeft),
    });
  } catch (error) {
    return next(error);
  }
};

const getPublicEvent = async (req, res, next) => {
  try {
    const { eventId } = parseOrThrow(eventIdSchema, req.params);
    const event = await populatePublicEvent(
      Event.findOne({ _id: eventId, isActive: true, startAt: { $gt: new Date() } })
    );
    if (!event) {
      const error = new Error('Active upcoming event not found');
      error.statusCode = 404;
      throw error;
    }
    return res.json({ success: true, event: addSeatsLeft(event) });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createEvent,
  getAdminEvents,
  updateEvent,
  deactivateEvent,
  listPublicEvents,
  getPublicEvent,
};
