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

// =====================================
// Basic Middlewares
// =====================================

app.use(express.json());

app.use(
  cors({
    origin: '*',
    credentials: false,
  })
);

// =====================================
// Cloudinary
// =====================================

connectCloudinary();

// =====================================
// Root Route
// =====================================

app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API Working',
  });
});

// =====================================
// Database Test Route
// =====================================

app.get('/test-db', async (req, res) => {
  try {
    console.log('==============================');
    console.log('TEST DB REQUEST');
    console.log('MONGO_URI EXISTS:', !!process.env.MONGO_URI);
    console.log(
      'DB READY STATE BEFORE:',
      mongoose.connection.readyState
    );

    const connected = await connectDB();

    console.log('CONNECT RESULT:', connected);
    console.log(
      'DB READY STATE AFTER:',
      mongoose.connection.readyState
    );

    if (
      connected &&
      mongoose.connection.readyState === 1
    ) {
      return res.status(200).json({
        success: true,
        message: 'Database is connected',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Database is NOT connected',
    });

  } catch (error) {
    console.error(
      'TEST DB ERROR:',
      error.message
    );

    return res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error.message,
    });
  }
});

// =====================================
// Database Middleware
// =====================================

app.use(async (req, res, next) => {
  try {
    console.log('==============================');
    console.log(
      'REQUEST:',
      req.method,
      req.originalUrl
    );

    console.log(
      'MONGO_URI EXISTS:',
      !!process.env.MONGO_URI
    );

    console.log(
      'DB READY STATE BEFORE:',
      mongoose.connection.readyState
    );

    const connected = await connectDB();

    console.log(
      'CONNECT RESULT:',
      connected
    );

    console.log(
      'DB READY STATE AFTER:',
      mongoose.connection.readyState
    );

    if (
      !connected ||
      mongoose.connection.readyState !== 1
    ) {
      console.error(
        'DATABASE CONNECTION FAILED'
      );

      return res.status(500).json({
        success: false,
        message: 'Database is not connected',
      });
    }

    console.log(
      'DATABASE CONNECTED - CONTINUING REQUEST'
    );

    next();

  } catch (error) {
    console.error(
      'DATABASE MIDDLEWARE ERROR:',
      error.message
    );

    return res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error.message,
    });
  }
});

// =====================================
// API Routes
// =====================================

app.use(
  '/api/admin',
  adminRouter
);

app.use(
  '/api/doctor',
  doctorRouter
);

app.use(
  '/api/user',
  userRouter
);

// =====================================
// 404 Handler
// =====================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'API route not found',
    path: req.originalUrl,
  });
});

// =====================================
// Local Development
// =====================================

if (!process.env.VERCEL) {
  const port = process.env.PORT || 4000;

  app.listen(port, () => {
    console.log(
      `Server started on PORT ${port}`
    );
  });
}

// =====================================
// Vercel Export
// =====================================

export default app;