const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const required = ['MONGO_URI', 'JWT_SECRET'];
for (const key of required) {
  if (!process.env[key] || !String(process.env[key]).trim()) {
    throw new Error(`Missing environment variable ${key}`);
  }
}

if (String(process.env.JWT_SECRET).length < 16) {
  throw new Error('JWT_SECRET must be at least 16 characters');
}

const port = Number(process.env.PORT) || 5000;
const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const allowedOrigins = Array.from(new Set(['http://localhost:5173', clientOrigin]));

module.exports = {
  port,
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientOrigin,
  allowedOrigins,
};
