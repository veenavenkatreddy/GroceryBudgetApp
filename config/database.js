const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected`);
  } catch (error) {
    console.error(`Mongo Error`, error);
    process.exit(1); // Exit process if DB connection fails
  }
};

module.exports = connectDB;
