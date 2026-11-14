const express = require('express');

const { processWebhook } = require('../controllers/paymentController');

const router = express.Router();

router.post('/', express.raw({ type: 'application/json' }), processWebhook);

module.exports = router;
