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
const organizerRoutes = require('./routes/organizerRoutes');
const adminRoutes = require('./routes/adminRoutes');
const testRoutes = require('./routes/testRoutes');

const app = express();
const port = Number(process.env.PORT) || 5000;
const isProduction = process.env.NODE_ENV === 'production';
const configuredFrontendOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedFrontendOrigins = new Set(configuredFrontendOrigins);

if (!isProduction) {
  allowedFrontendOrigins.add('http://localhost:5173');
  allowedFrontendOrigins.add('http://127.0.0.1:5173');
}

app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedFrontendOrigins.has(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
}));
app.use(express.json());
app.use(morgan('dev'));

app.get('/api/v1/health', (req, res) => {
  res.json({ success: true, message: 'Event Ticket Booking API is running' });
});
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Event Ticket Booking API is running' });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/events', eventRoutes);
app.use('/api/v1/bookings', bookingRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/organizer', organizerRoutes);
app.use('/api/v1/admin', adminRoutes);
if (process.env.NODE_ENV !== 'production') {
  app.use('/api/v1/test', testRoutes);
}
app.use(notFound);
app.use(errorHandler);

const startServer = async () => {
  try {
    await connectDB();
    app.listen(port, '0.0.0.0', () => {
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
