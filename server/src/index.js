import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import catalogRoutes from './routes/catalog.js';
import customerRoutes from './routes/customers.js';
import subscriptionRoutes from './routes/subscriptions.js';
import invoiceRoutes from './routes/invoices.js';
import billingRoutes from './routes/billing.js';
import paymentRoutes from './routes/payments.js';
import reportRoutes from './routes/reports.js';
import portalRoutes from './routes/portal.js';

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use('/api/payments', paymentRoutes);
app.use('/api/reports', reportRoutes);

app.use('/api/portal', portalRoutes);

app.use('/api/auth', authRoutes);
app.use(errorHandler);

app.use('/api/invoices', invoiceRoutes); 
app.use('/api/billing', billingRoutes);  

app.use('/api/auth', authRoutes);
app.use('/api', catalogRoutes);  

app.use('/api/customers', customerRoutes); 
app.use('/api/subscriptions', subscriptionRoutes);  
app.use('/api', catalogRoutes);

await mongoose.connect(process.env.MONGO_URI);
app.listen(process.env.PORT, () => console.log('API on', process.env.PORT));