const Booking = require('../models/Booking');
const Event = require('../models/Event');
const {
  attendeeQuerySchema,
  eventIdSchema,
  parseOrThrow,
} = require('../validators/organizerValidator');

const eventProjection = 'title description startAt seatLimit ticketsBooked ticketPrice isActive organizerId venueId categoryId';
const createHttpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const addSeatsLeft = (event) => {
  const item = event.toObject ? event.toObject() : event;
  return { ...item, seatsLeft: item.seatLimit - item.ticketsBooked };
};

const populateEvents = (query) => query
  .select(eventProjection)
  .populate('venueId', 'name address capacity')
  .populate('categoryId', 'name description');

const getOrganizerEvents = async (organizerId) =>
  populateEvents(Event.find({ organizerId }).sort({ startAt: 1 }));

const getDashboard = async (req, res, next) => {
  try {
    const events = await getOrganizerEvents(req.user._id);
    const eventIds = events.map((event) => event._id);
    const [confirmed] = await Booking.aggregate([
      { $match: { eventId: { $in: eventIds }, status: 'BOOKED' } },
      { $group: { _id: null, tickets: { $sum: '$quantity' } } },
    ]);
    const now = new Date();
    const upcomingEvents = events.filter((event) => event.isActive && event.startAt > now);
    const totalAvailableSeats = events.reduce(
      (total, event) => total + Math.max(0, event.seatLimit - event.ticketsBooked),
      0
    );

    return res.json({
      success: true,
      summary: {
        totalAssignedEvents: events.length,
        upcomingEvents: upcomingEvents.length,
        confirmedTicketsBooked: confirmed?.tickets || 0,
        totalAvailableSeats,
      },
      events: events.map(addSeatsLeft),
    });
  } catch (error) {
    return next(error);
  }
};

const listEvents = async (req, res, next) => {
  try {
    const events = await getOrganizerEvents(req.user._id);
    return res.json({
      success: true,
      count: events.length,
      events: events.map(addSeatsLeft),
    });
  } catch (error) {
    return next(error);
  }
};

const listAttendees = async (req, res, next) => {
  try {
    const { eventId } = parseOrThrow(eventIdSchema, req.params);
    const { status, search, page, limit } = parseOrThrow(attendeeQuerySchema, req.query);
    const event = await Event.findOne({ _id: eventId, organizerId: req.user._id }).select('_id title');
    if (!event) throw createHttpError(404, 'Event not found');

    const match = { eventId: event._id, status };
    const pipeline = [
      { $match: match },
      {
        $lookup: {
          from: 'users',
          localField: 'attendeeId',
          foreignField: '_id',
          as: 'attendee',
        },
      },
      { $unwind: '$attendee' },
    ];
    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = { $regex: escapedSearch, $options: 'i' };
      pipeline.push({
        $match: {
          $or: [
            { 'attendee.name': searchRegex },
            { 'attendee.email': searchRegex },
            { bookingReference: searchRegex },
          ],
        },
      });
    }

    pipeline.push({
      $facet: {
        metadata: [{ $count: 'total' }],
        attendees: [
          { $sort: { createdAt: -1 } },
          { $skip: (page - 1) * limit },
          { $limit: limit },
          {
            $project: {
              _id: 1,
              bookingReference: 1,
              quantity: 1,
              status: 1,
              createdAt: 1,
              attendee: { name: '$attendee.name', email: '$attendee.email' },
            },
          },
        ],
      },
    });

    const [result] = await Booking.aggregate(pipeline);
    const total = result?.metadata[0]?.total || 0;
    return res.json({
      success: true,
      event: { id: event._id, title: event.title },
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      attendees: result?.attendees || [],
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = { getDashboard, listEvents, listAttendees };
