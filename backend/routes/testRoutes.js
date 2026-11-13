const express = require('express');

const authenticate = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');

const router = express.Router();

router.get('/attendee', authenticate, authorizeRoles('ATTENDEE'), (req, res) => {
  res.json({
    success: true,
    message: 'Attendee test endpoint accessed successfully',
    user: { id: req.user._id, role: req.user.role },
  });
});

router.get('/organizer', authenticate, authorizeRoles('ORGANIZER'), (req, res) => {
  res.json({
    success: true,
    message: 'Organizer test endpoint accessed successfully',
    user: { id: req.user._id, role: req.user.role },
  });
});

router.get('/admin', authenticate, authorizeRoles('ADMIN'), (req, res) => {
  res.json({
    success: true,
    message: 'Admin test endpoint accessed successfully',
    user: { id: req.user._id, role: req.user.role },
  });
});

module.exports = router;
