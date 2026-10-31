import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

await mongoose.connect(process.env.MONGO_URI);
await User.updateOne(
  { email: 'admin@brightloop.com' },
  { name: 'Admin', role: 'admin', password: await bcrypt.hash('Admin@12345', 10) },
  { upsert: true }
);
console.log('admin ready'); process.exit();