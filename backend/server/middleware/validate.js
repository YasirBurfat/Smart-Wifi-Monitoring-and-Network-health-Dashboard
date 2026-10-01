const ApiError = require('../utils/ApiError');

function validate(schema) {
  return function validateRequest(req, _res, next) {
    const parsed = schema.safeParse({
      body: req.body ?? {},
      query: req.query ?? {},
      params: req.params ?? {},
    });

    if (!parsed.success) {
      const errors = parsed.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }));
      return next(new ApiError(400, 'Validation failed', errors));
    }

    req.validated = parsed.data;
    return next();
  };
}

module.exports = validate;
