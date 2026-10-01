const jwt = require('jsonwebtoken');
const { jwtSecret, jwtExpiresIn } = require('../config/env');

function signToken(user) {
  return jwt.sign({ sub: user._id.toString() }, jwtSecret, { expiresIn: jwtExpiresIn });
}

function verifyToken(token) {
  return jwt.verify(token, jwtSecret, { algorithms: ['HS256'] });
}

module.exports = { signToken, verifyToken };
