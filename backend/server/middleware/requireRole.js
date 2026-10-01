const ApiError = require('../utils/ApiError');

function requireRole(...roles) {
  return function checkRole(req, _res, next) {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, 'You do not have permission to perform this action'));
    }
    return next();
  };
}

module.exports = requireRole;
