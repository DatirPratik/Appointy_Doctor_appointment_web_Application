import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';

import connectDB from './config/mongodb.js';
import connectCloudinary from './config/cloudinary.js';

import adminRouter from './routes/adminRoute.js';
import doctorRouter from './routes/doctorRoute.js';
import userRouter from './routes/userRoute.js';

const app = express();

// Middlewares
app.use(express.json());

app.use(
  cors({
    origin: '*',
    credentials: false,
  })
);

// Cloudinary
connectCloudinary();

// API Routes
app.use('/api/admin', adminRouter);
app.use('/api/doctor', doctorRouter);
app.use('/api/user', userRouter);

// Root
app.get('/', (req, res) => {
  res.status(200).send('API Working');
});

// Test MongoDB
app.get('/test-db', async (req, res) => {
  try {
    await connectDB();

    const state = mongoose.connection.readyState;

    if (state === 1) {
      return res.status(200).send('Database is connected');
    }

    return res.status(500).send('Database is NOT connected');
  } catch (error) {
    console.error('Test DB Error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error.message,
    });
  }
});

if (!process.env.VERCEL) {
  const port = process.env.PORT || 4000;

  app.listen(port, () => {
    console.log(`Server started on PORT: ${port}`);
  });
}



// Vercel
export default app;