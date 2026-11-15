const express = require('express');

const authenticate = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');
const {
  createEvent,
  getAdminEvents,
  updateEvent,
  deactivateEvent,
  activateEvent,
  listPublicEvents,
  getPublicEvent,
} = require('../controllers/eventController');

const router = express.Router();

router.post('/', authenticate, authorizeRoles('ADMIN'), createEvent);
router.get('/admin', authenticate, authorizeRoles('ADMIN'), getAdminEvents);
router.get('/', listPublicEvents);
router.put('/:eventId', authenticate, authorizeRoles('ADMIN'), updateEvent);
router.patch('/:eventId/deactivate', authenticate, authorizeRoles('ADMIN'), deactivateEvent);
router.patch('/:eventId/activate', authenticate, authorizeRoles('ADMIN'), activateEvent);
router.get('/:eventId', getPublicEvent);

module.exports = router;
