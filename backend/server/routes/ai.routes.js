const express = require('express');
const { requireAuth } = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const { emptySchema } = require('../validators/common');
const { STAFF_ROLES } = require('../utils/constants');
const ai = require('../controllers/ai.controller');
const { classifySchema } = require('../validators/ai.validators');

const router = express.Router();

router.use(requireAuth, requireRole(...STAFF_ROLES));
router.get('/anomalies', validate(emptySchema), ai.anomalies);
router.get('/summary', validate(emptySchema), ai.summary);
router.get('/recommendations', validate(emptySchema), ai.recommendations);
router.post('/classify', validate(classifySchema), ai.classify);

module.exports = router;
