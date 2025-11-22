const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const { autoConfirmExpiredTransactions, sendTimerWarnings } = require('./utils/cronJobs');

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

// Initialize cron jobs
autoConfirmExpiredTransactions();
sendTimerWarnings();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import routes
const authRoutes = require('./routes/authRoutes');
const couponRoutes = require('./routes/couponRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const userRoutes = require('./routes/userRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

// Basic route for testing
app.get('/', (req, res) => {
  res.json({ message: 'Coupon Marketplace API' });
});

// Register routes
app.use('/api/auth', authRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/payments', paymentRoutes);

// Error handling middleware (must be last)
const errorHandler = require('./middleware/errorMiddleware');
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
