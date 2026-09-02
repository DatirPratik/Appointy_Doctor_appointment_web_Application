import mongoose from "mongoose";

const connectDB = async () => {
  try {
    // Already connected
    if (mongoose.connection.readyState === 1) {
      return true;
    }

    // Check MONGO_URI
    if (!process.env.MONGO_URI) {
      console.error("MONGO_URI is not defined");
      return false;
    }

    // Connect MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
    });

    console.log("Database Connected");

    return true;

  } catch (error) {
    console.error("Database connection error:", error.message);

    return false;
  }
};

export default connectDB;