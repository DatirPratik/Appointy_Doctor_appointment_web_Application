import mongoose from "mongoose";

let connectPromise = null;

const connectDB = async () => {
  // Already connected
  if (mongoose.connection.readyState === 1) {
    console.log("MongoDB already connected");
    return true;
  }

  // Check environment variable
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is not defined");
  }

  // If connection is already in progress, wait for it
  if (!connectPromise) {
    console.log("Connecting to MongoDB...");

    connectPromise = mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
    });
  }

  try {
    await connectPromise;

    console.log("MongoDB Connected Successfully");

    return true;

  } catch (error) {
    connectPromise = null;

    console.error(
      "MongoDB Connection Error:",
      error.message
    );

    throw error;
  }
};

export default connectDB;