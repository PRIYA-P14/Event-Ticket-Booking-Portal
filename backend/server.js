require('dotenv').config();

const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');

const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const authRoutes = require('./routes/authRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const eventRoutes = require('./routes/eventRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const paymentWebhookRoutes = require('./routes/paymentWebhookRoutes');
const testRoutes = require('./routes/testRoutes');

const app = express();
const port = Number(process.env.PORT) || 5000;

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use('/api/v1/payments/webhook', paymentWebhookRoutes);
app.use(express.json());
app.use(morgan('dev'));

app.get('/api/v1/health', (req, res) => {
  res.json({ success: true, message: 'Event Ticket Booking API is running' });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/events', eventRoutes);
app.use('/api/v1/bookings', bookingRoutes);
app.use('/api/v1/payments', paymentRoutes);
if (process.env.NODE_ENV !== 'production') {
  app.use('/api/v1/test', testRoutes);
}
app.use(notFound);
app.use(errorHandler);

const startServer = async () => {
  try {
    await connectDB();
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (error) {
    console.error(`Server startup failed: ${error.message}`);
    process.exitCode = 1;
  }
};

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
