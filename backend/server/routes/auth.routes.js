const express = require('express');
const rateLimit = require('express-rate-limit');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/requireAuth');
const { emptySchema } = require('../validators/common');
const { registerSchema, loginSchema } = require('../validators/auth.validators');
const auth = require('../controllers/auth.controller');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler(_req, res) {
    res.status(429).json({
      ok: false,
      message: 'Too many login attempts. Try again later.',
    });
  },
});

const router = express.Router();

router.post('/register', validate(registerSchema), auth.register);
router.post('/login', loginLimiter, validate(loginSchema), auth.login);
router.get('/me', requireAuth, validate(emptySchema), auth.me);

module.exports = router;
