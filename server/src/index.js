import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cookieParser from 'cookie-parser';
import cors from 'cors';

import authRoutes from './routes/auth.js';
import catalogRoutes from './routes/catalog.js';
import customerRoutes from './routes/customers.js';
import subscriptionRoutes from './routes/subscriptions.js';
import invoiceRoutes from './routes/invoices.js';
import billingRoutes from './routes/billing.js';
import paymentRoutes from './routes/payments.js';
import reportRoutes from './routes/reports.js';
import portalRoutes from './routes/portal.js';

import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// Global middleware
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());

// API routes — each mounted only once
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/portal', portalRoutes);
app.use('/api', catalogRoutes);

// Error handler must be registered after all routes
app.use(errorHandler);

// Connect to MongoDB and start server
await mongoose.connect(process.env.MONGO_URI);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
});