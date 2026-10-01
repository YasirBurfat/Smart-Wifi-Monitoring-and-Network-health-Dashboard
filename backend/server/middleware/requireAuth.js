const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { verifyToken } = require('../utils/tokens');

async function requireAuth(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new ApiError(401, 'Authentication required');
    }

    const payload = verifyToken(token);
    const user = await User.findById(payload.sub);
    if (!user) {
      throw new ApiError(401, 'Authentication required');
    }
    if (user.accountStatus !== 'active') {
      throw new ApiError(403, 'Account is disabled');
    }

    req.user = user;
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = { requireAuth };
