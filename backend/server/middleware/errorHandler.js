const ApiError = require('../utils/ApiError');

function notFound(req, res) {
  res.status(404).json({ ok: false, message: 'Not found' });
}

function errorHandler(err, req, res, _next) {
  let status = err.statusCode || err.status || 500;
  let message = err.message || 'Internal server error';
  let errors = Array.isArray(err.errors) ? err.errors : undefined;

  if (err.name === 'ValidationError' && err.errors && !Array.isArray(err.errors)) {
    status = 400;
    message = 'Validation failed';
    errors = Object.values(err.errors).map((item) => ({
      path: item.path,
      message: item.message,
    }));
  } else if (err.name === 'CastError') {
    status = 400;
    message = 'Invalid id';
  } else if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyPattern || err.keyValue || {})[0];
    message = field ? `A record with that ${field} already exists` : 'Duplicate value';
  } else if (err.name === 'TokenExpiredError') {
    status = 401;
    message = 'Token expired';
    errors = undefined;
  } else if (err.name === 'JsonWebTokenError') {
    status = 401;
    message = 'Invalid token';
    errors = undefined;
  } else if (err.name === 'ZodError') {
    status = 400;
    message = 'Validation failed';
    errors = err.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Invalid JSON';
  } else if (err.type === 'entity.too.large' || status === 413) {
    status = 413;
    message = 'Request body is too large';
  } else if (!(err instanceof ApiError) && status >= 500) {
    message = 'Internal server error';
  }

  if (status >= 500) {
    console.error(err);
    if (!(err instanceof ApiError)) message = 'Internal server error';
  }

  const body = { ok: false, message };
  if (errors && errors.length) body.errors = errors;
  res.status(status).json(body);
}

module.exports = { notFound, errorHandler };
