import mongoose from "mongoose";

const connectDB = async () => {
  try {

    // Already connected
    if (mongoose.connection.readyState === 1) {
      console.log("MongoDB already connected");
      return true;
    }

    // Check environment variable
    if (!process.env.MONGO_URI) {
      console.error("MONGO_URI is not defined");
      return false;
    }

    console.log("Connecting to MongoDB...");

    await mongoose.connect(
      process.env.MONGO_URI,
      {
        serverSelectionTimeoutMS: 10000,
      }
    );

    console.log("MongoDB Connected Successfully");

    return true;

  } catch (error) {

    console.error(
      "MongoDB Connection Error:",
      error.message
    );

    return false;
  }
};

export default connectDB;