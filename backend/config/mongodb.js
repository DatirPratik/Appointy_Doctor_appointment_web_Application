import mongoose from "mongoose";

let isConnecting = null;

const connectDB = async () => {
  try {
    // Already connected
    if (mongoose.connection.readyState === 1) {
      console.log("MongoDB already connected");
      return;
    }

    // Connection already in progress
    if (mongoose.connection.readyState === 2) {
      console.log("MongoDB connection already in progress");

      if (isConnecting) {
        await isConnecting;
      }

      return;
    }

    // Check environment variable
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is not defined");
    }

    console.log("Connecting to MongoDB...");

    isConnecting = mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
    });

    await isConnecting;

    console.log("MongoDB Connected Successfully");

  } catch (error) {
    console.error(
      "MongoDB Connection Error:",
      error.message
    );

    throw error;

  } finally {
    isConnecting = null;
  }
};

export default connectDB;