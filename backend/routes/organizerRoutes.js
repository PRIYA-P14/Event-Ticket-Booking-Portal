const express = require('express');

const authenticate = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');
const {
  getDashboard,
  listEvents,
  listAttendees,
} = require('../controllers/organizerController');

const router = express.Router();

router.use(authenticate, authorizeRoles('ORGANIZER'));
router.get('/dashboard', getDashboard);
router.get('/events', listEvents);
router.get('/events/:eventId/attendees', listAttendees);

module.exports = router;
