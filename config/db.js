const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/velora-trial");

    console.log("MongoDB Connected");
  } catch (error) {
    console.log("DB Connection Error:", error);
  }
};

module.exports = connectDB;