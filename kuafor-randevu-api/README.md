# Barber Shop Appointment API

This is a RESTful API for managing barber shop appointments.

## Features

- User authentication
- Appointment management
- Service management
- Barber management

## Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/kuafor-randevu
```

4. Start the development server:
```bash
npm run dev
```

## API Endpoints

### Authentication
- POST /api/auth/register - Register a new user
- POST /api/auth/login - Login user
- GET /api/auth/me - Get current user

### Appointments
- GET /api/appointments - Get all appointments
- POST /api/appointments - Create a new appointment
- GET /api/appointments/:id - Get appointment by ID
- PUT /api/appointments/:id - Update appointment
- DELETE /api/appointments/:id - Delete appointment

### Services
- GET /api/services - Get all services
- POST /api/services - Create a new service
- GET /api/services/:id - Get service by ID
- PUT /api/services/:id - Update service
- DELETE /api/services/:id - Delete service

### Barbers
- GET /api/barbers - Get all barbers
- POST /api/barbers - Create a new barber
- GET /api/barbers/:id - Get barber by ID
- PUT /api/barbers/:id - Update barber
- DELETE /api/barbers/:id - Delete barber 