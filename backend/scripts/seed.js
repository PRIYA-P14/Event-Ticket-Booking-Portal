require('dotenv').config();

const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const connectDB = require('../config/db');
const User = require('../models/User');
const Venue = require('../models/Venue');
const Category = require('../models/Category');
const Event = require('../models/Event');

const seedUsers = [
  {
    name: 'System Administrator',
    email: 'admin@eventportal.com',
    phone: '9000000001',
    role: 'ADMIN',
  },
  {
    name: 'Tech Events Organizer',
    email: 'tech.organizer@eventportal.com',
    phone: '9000000002',
    role: 'ORGANIZER',
  },
  {
    name: 'Cultural Events Organizer',
    email: 'cultural.organizer@eventportal.com',
    phone: '9000000003',
    role: 'ORGANIZER',
  },
];

const seedVenues = [
  { name: 'Main Auditorium', address: 'College Campus', capacity: 1000 },
  { name: 'Seminar Hall', address: 'College Campus', capacity: 300 },
];

const seedCategories = [
  { name: 'Technical', description: 'Technology and engineering events' },
  { name: 'Cultural', description: 'Arts, culture, and festival events' },
  { name: 'Workshop', description: 'Hands-on learning and practical sessions' },
  { name: 'Sports', description: 'Sports competitions and athletic events' },
];

const upsertBy = async (Model, filter, document, options = {}) => {
  const result = await Model.updateOne(
    filter,
    {
      $set: { ...document, ...options.update },
      $setOnInsert: options.setOnInsert || {},
    },
    { upsert: true, runValidators: true }
  );

  return {
    created: result.upsertedCount === 1,
    document: await Model.findOne(filter),
  };
};

const seed = async () => {
  const { SEED_ADMIN_PASSWORD, SEED_ORGANIZER_PASSWORD } = process.env;

  if (!SEED_ADMIN_PASSWORD || !SEED_ORGANIZER_PASSWORD) {
    throw new Error(
      'SEED_ADMIN_PASSWORD and SEED_ORGANIZER_PASSWORD must be set in backend/.env'
    );
  }

  await connectDB();

  const adminPasswordHash = await bcrypt.hash(SEED_ADMIN_PASSWORD, 12);
  const organizerPasswordHash = await bcrypt.hash(SEED_ORGANIZER_PASSWORD, 12);
  const userResults = [];

  for (const user of seedUsers) {
    const passwordHash =
      user.role === 'ADMIN' ? adminPasswordHash : organizerPasswordHash;
    const result = await upsertBy(
      User,
      { email: user.email },
      { ...user, passwordHash, isActive: true }
    );
    userResults.push({ email: user.email, created: result.created, user: result.document });
  }

  const venueResults = [];
  for (const venue of seedVenues) {
    const result = await upsertBy(Venue, { name: venue.name }, { ...venue, isActive: true });
    venueResults.push({ name: venue.name, created: result.created, venue: result.document });
  }

  const categoryResults = [];
  for (const category of seedCategories) {
    const result = await upsertBy(
      Category,
      { name: category.name },
      { ...category, isActive: true }
    );
    categoryResults.push({
      name: category.name,
      created: result.created,
      category: result.document,
    });
  }

  const usersByEmail = new Map(userResults.map(({ email, user }) => [email, user]));
  const venuesByName = new Map(venueResults.map(({ name, venue }) => [name, venue]));
  const categoriesByName = new Map(
    categoryResults.map(({ name, category }) => [name, category])
  );
  const eventDefinitions = [
    {
      title: 'National Technical Symposium',
      description: 'A conference showcasing emerging technology and engineering ideas.',
      organizerEmail: 'tech.organizer@eventportal.com',
      venueName: 'Main Auditorium',
      categoryName: 'Technical',
      seatLimit: 500,
      ticketPrice: 200,
      daysFromNow: 30,
    },
    {
      title: 'Coding Hackathon',
      description: 'A collaborative programming challenge for student developers.',
      organizerEmail: 'tech.organizer@eventportal.com',
      venueName: 'Seminar Hall',
      categoryName: 'Workshop',
      seatLimit: 200,
      ticketPrice: 100,
      daysFromNow: 45,
    },
    {
      title: 'Annual Cultural Fest',
      description: 'A celebration of music, dance, theatre, and campus creativity.',
      organizerEmail: 'cultural.organizer@eventportal.com',
      venueName: 'Main Auditorium',
      categoryName: 'Cultural',
      seatLimit: 800,
      ticketPrice: 150,
      daysFromNow: 60,
    },
    {
      title: 'Intercollege Sports Meet',
      description: 'An intercollege competition featuring multiple sporting events.',
      organizerEmail: 'cultural.organizer@eventportal.com',
      venueName: 'Seminar Hall',
      categoryName: 'Sports',
      seatLimit: 250,
      ticketPrice: 100,
      daysFromNow: 75,
    },
  ];

  const eventResults = [];
  for (const definition of eventDefinitions) {
    const venue = venuesByName.get(definition.venueName);
    if (definition.seatLimit > venue.capacity) {
      throw new Error(`Seat limit exceeds venue capacity for ${definition.title}`);
    }

    const result = await upsertBy(
      Event,
      { title: definition.title },
      {
        title: definition.title,
        description: definition.description,
        organizerId: usersByEmail.get(definition.organizerEmail)._id,
        venueId: venue._id,
        categoryId: categoriesByName.get(definition.categoryName)._id,
        startAt: new Date(Date.now() + definition.daysFromNow * 24 * 60 * 60 * 1000),
        seatLimit: definition.seatLimit,
        ticketPrice: definition.ticketPrice,
        isActive: true,
      },
      { setOnInsert: { ticketsBooked: 0 } }
    );
    eventResults.push({ title: definition.title, created: result.created });
  }

  const count = (items) => ({
    inserted: items.filter((item) => item.created).length,
    updated: items.filter((item) => !item.created).length,
  });

  console.log('Database seed completed successfully.');
  console.log(`Users: ${count(userResults).inserted} inserted, ${count(userResults).updated} updated`);
  console.log(`Venues: ${count(venueResults).inserted} inserted, ${count(venueResults).updated} updated`);
  console.log(
    `Categories: ${count(categoryResults).inserted} inserted, ${count(categoryResults).updated} updated`
  );
  console.log(`Events: ${count(eventResults).inserted} inserted, ${count(eventResults).updated} updated`);
  console.log('Sample login emails:');
  console.log('  admin@eventportal.com');
  console.log('  tech.organizer@eventportal.com');
  console.log('  cultural.organizer@eventportal.com');
};

seed()
  .catch((error) => {
    console.error(`Database seed failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
