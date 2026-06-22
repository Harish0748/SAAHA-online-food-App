require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Allowed origins (from env, comma separated)
const allowedOriginsEnv = process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:5174';
const allowedOrigins = allowedOriginsEnv.split(',').map((s) => s.trim()).filter(Boolean);

// Socket.IO for real-time order tracking (restrict origins)
const io = new Server(server, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST'] },
});

// Make io accessible in routes
app.set('io', io);

// ── Middleware ──────────────────────────────────────────
// Security headers
app.use(helmet());

// CORS with whitelist
app.use(
  cors({
    origin: (origin, callback) => {
      // allow requests with no origin (curl, mobile apps, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

// Rate limiter for auth endpoints (protect against brute force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth', authLimiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ── Routes ──────────────────────────────────────────────
app.use('/api/auth/customer', require('./routes/auth.customer'));
app.use('/api/auth/customer-otp', require('./routes/auth.otp'));
app.use('/api/auth/restaurant', require('./routes/auth.restaurant'));
app.use('/api/auth/rider', require('./routes/auth.rider'));
app.use('/api/auth/admin', require('./routes/auth.admin'));
app.use('/api/restaurants', require('./routes/restaurants'));
app.use('/api/menu', require('./routes/menu'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/rider', require('./routes/rider'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/subscriptions', require('./routes/subscriptions'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/admin', require('./routes/admin'));

// ── Health check ────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', app: 'SAAHA', version: '1.0.0', time: new Date() });
});

// ── Socket.IO real-time events ──────────────────────────
io.on('connection', (socket) => {
  console.log('🔌 Socket connected:', socket.id);

  // Join order room for tracking
  socket.on('join_order', (orderId) => {
    socket.join(`order_${orderId}`);
  });

  // Rider location update
  socket.on('rider_location', ({ orderId, lat, lng }) => {
    io.to(`order_${orderId}`).emit('location_update', { lat, lng });
  });

  // Restaurant receives new order notification
  socket.on('join_restaurant', (restaurantId) => {
    socket.join(`restaurant_${restaurantId}`);
  });

  // Rider joins their channel
  socket.on('join_rider', (riderId) => {
    socket.join(`rider_${riderId}`);
  });

  socket.on('disconnect', () => {
    console.log('🔌 Socket disconnected:', socket.id);
  });
});

// ── Error handler ───────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 SAAHA backend running on port ${PORT}`);
});

module.exports = { app, io };
