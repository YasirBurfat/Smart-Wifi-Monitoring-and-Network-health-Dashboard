const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error('MONGO_URI is not set');
  }

  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);

  let host = 'database';
  try {
    const normalized = uri.replace(/^mongodb(\+srv)?:\/\//, 'http://');
    host = new URL(normalized).host;
  } catch (_err) {
    host = 'database';
  }
  console.log(`MongoDB connected (${host})`);
  return mongoose.connection;
}

module.exports = connectDB;
