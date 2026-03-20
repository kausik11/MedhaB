const mongoose = require("mongoose");

// Fail fast instead of buffering queries when disconnected
mongoose.set("bufferCommands", false);

let isConnected = false;
let connectionPromise;

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error("MONGO_URI is not defined");
  }

  if (isConnected || mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!connectionPromise) {
    console.log("Connecting to MongoDB...");
    connectionPromise = mongoose
      .connect(mongoUri, {
        serverSelectionTimeoutMS: 8000,
        connectTimeoutMS: 8000,
        socketTimeoutMS: 20000,
      })
      .then((db) => {
        isConnected = db.connections[0].readyState === 1;
        console.log("MongoDB connected");
        return db;
      })
      .catch((err) => {
        connectionPromise = null; // allow retry on next invocation
        console.error("Mongo connection error:", err);
        throw err;
      });
  }

  return connectionPromise;
};

module.exports = connectDB;
