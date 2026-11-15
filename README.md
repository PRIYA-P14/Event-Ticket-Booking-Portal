# Eventra – Event Ticket Booking Portal

A full-stack web application for discovering events, booking tickets, and managing event operations through separate attendee, organizer, and administrator roles.

## Live Application

- **Frontend:** https://event-ticket-booking-portal-14.onrender.com
- **Backend API:** https://event-ticket-booking-portal-snpy.onrender.com
- **API health check:** https://event-ticket-booking-portal-snpy.onrender.com/api/v1/health

> Render free services may take a short time to respond after being idle.

## Features

### Attendee
- Register, log in, and log out.
- Browse public events and view event details.
- Book tickets and view personal bookings.
- Cancel eligible bookings.
- View payment status.

### Organizer
- Access an organizer dashboard.
- View organizer event listings.
- View attendees for an event.

### Administrator
- Access the administration dashboard.
- Create and manage organizers.
- Create and manage venues and event categories.
- View and manage event activation status.
- View bookings.
- Create and update events.

### Booking and payment
- Booking references are generated for bookings.
- Booking quantities are restricted to 1–6 tickets.
- Booking states include `PENDING_PAYMENT`, `BOOKED`, `CANCELLED`, `PAYMENT_FAILED`, and `EXPIRED`.
- Ticket reservation uses an atomic database update to help prevent overbooking.
- The current application includes a simulated payment flow; do not assume live payment gateway processing is enabled.

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React, Vite, React Router, Axios |
| Backend | Node.js, Express.js |
| Database | MongoDB Atlas, Mongoose |
| Authentication | JSON Web Tokens (JWT), bcrypt |
| Security and middleware | Helmet, CORS, express-rate-limit, Morgan |
| Deployment | Render |

## Repository Structure

```text
Event-Ticket-Booking-Portal/
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── scripts/
│   ├── .env.example
│   └── package.json
├── event-ticket-booking-portal/
│   └── frontend/
│       ├── src/
│       ├── public/
│       ├── .env.example
│       └── package.json
└── README.md
```

*The exact folders and files may change as the project develops.*

## User Roles

| Role | Main permissions |
|---|---|
| `ATTENDEE` | Browse events, book tickets, view and cancel own bookings |
| `ORGANIZER` | View organizer dashboard, events, and event attendees |
| `ADMIN` | Manage organizers, venues, categories, events, and bookings |

Protected endpoints require a valid JWT. Role-restricted endpoints also require the corresponding role.

## API Overview

Base URL:

```text
https://event-ticket-booking-portal-snpy.onrender.com/api/v1
```

| Module | Base path | Main operations |
|---|---|---|
| Authentication | `/auth` | Register, login, current user, logout |
| Events | `/events` | List and view public events; admin event management |
| Bookings | `/bookings` | Create, view, and cancel bookings |
| Payments | `/payments` | Simulate payment and retrieve payment/refund status |
| Organizer | `/organizer` | Dashboard, events, attendee list |
| Administration | `/admin` | Dashboard, organizers, venues, categories, bookings |
| Health | `/health` | API health check |

### Authentication header

For protected endpoints, send the JWT using:

```http
Authorization: Bearer <JWT_TOKEN>
```

### Health check

```http
GET https://event-ticket-booking-portal-snpy.onrender.com/api/v1/health
```

Example response:

```json
{
  "success": true,
  "message": "Event Ticket Booking API is running"
}
```

## Local Development Setup

### Prerequisites

- Node.js and npm
- MongoDB database (local MongoDB or MongoDB Atlas)
- Git

### 1. Clone the repository

```bash
git clone https://github.com/PRIYA-P14/Event-Ticket-Booking-Portal.git
cd Event-Ticket-Booking-Portal
```

### 2. Configure the backend

```bash
cd backend
npm install
```

Create a `.env` file using the supplied `.env.example` as a reference. Configure your own local values for the variables required by the backend, such as:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=<YOUR_MONGODB_CONNECTION_STRING>
JWT_SECRET=<YOUR_LONG_RANDOM_SECRET>
JWT_EXPIRES_IN=1d
FRONTEND_URL=http://localhost:5173
```

Do not commit `.env` or share secret values.

Start the backend using the start script defined in `backend/package.json`:

```bash
npm start
```

The API runs on port `5000` by default, unless another `PORT` is configured.

### 3. Configure the frontend

Open a second terminal:

```bash
cd event-ticket-booking-portal/frontend
npm install
```

Create a frontend `.env` file using the frontend `.env.example` as a reference. Set the API URL:

```env
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

Start the Vite development server:

```bash
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`.

## Environment Variables

| Variable | Purpose |
|---|---|
| `NODE_ENV` | Backend environment, such as development or production |
| `PORT` | Backend listening port |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret used to sign JWTs |
| `JWT_EXPIRES_IN` | JWT expiration setting |
| `FRONTEND_URL` | Allowed frontend origin(s) for CORS |
| `VITE_API_BASE_URL` | Backend API base URL used by the frontend |

Use the committed `.env.example` files as the authoritative list of variables required by each application. Never commit real credentials.

## Database

The application uses MongoDB with Mongoose models for users, events, categories, venues, bookings, payments, counters, and notifications.

Relationships between documents are represented using MongoDB ObjectId references. Mongoose schemas define field validation, defaults, and indexes.

## Security Notes

- Passwords are stored as bcrypt hashes, not plain text.
- JWT authentication protects private endpoints.
- Role-based authorization restricts role-specific operations.
- Authentication endpoints are rate-limited.
- Helmet adds HTTP security headers.
- CORS is configured to allow the configured frontend origin(s).
- Keep `.env` files, database credentials, JWT secrets, seed passwords, and database backups containing personal data out of the public repository.

## Known Limitations

- The current payment flow includes payment simulation; live payment gateway processing should not be assumed.
- Email/SMS delivery and QR-code ticket verification are not documented as implemented features.
- Organizer capabilities currently include dashboard, event listing, and attendee listing routes; event creation and administration routes are restricted to administrators.

## Future Enhancements

- Integrate and test a live payment gateway.
- Add email and SMS booking notifications.
- Add QR-code ticket generation and entry verification.
- Expand organizer event-management capabilities.
- Add sales analytics and reporting.
- Increase automated test coverage and monitoring.

## Project Documentation

The project submission can include separate documents for:

1. MongoDB database schema and ER diagram.
2. REST API documentation.
3. Project design choices, known gaps, and future improvements.

## Author

**GitHub:** [PRIYA-P14](https://github.com/PRIYA-P14)

**Repository:** [Event-Ticket-Booking-Portal](https://github.com/PRIYA-P14/Event-Ticket-Booking-Portal)
