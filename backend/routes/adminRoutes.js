const express = require('express');

const authenticate = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');
const admin = require('../controllers/adminController');

const router = express.Router();
router.use(authenticate, authorizeRoles('ADMIN'));

router.get('/dashboard', admin.getDashboard);
router.get('/organizers', admin.listOrganizers);
router.post('/organizers', admin.createOrganizer);
router.put('/organizers/:id', admin.updateOrganizer);
router.patch('/organizers/:id/status', admin.setOrganizerStatus);
router.get('/venues', admin.listVenues);
router.post('/venues', admin.createVenue);
router.put('/venues/:id', admin.updateVenue);
router.patch('/venues/:id/status', admin.setVenueStatus);
router.get('/categories', admin.listCategories);
router.post('/categories', admin.createCategory);
router.put('/categories/:id', admin.updateCategory);
router.patch('/categories/:id/status', admin.setCategoryStatus);
router.get('/bookings', admin.listBookings);

module.exports = router;
