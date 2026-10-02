const express = require('express');
const { requireAuth } = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const { emptySchema } = require('../validators/common');
const { STAFF_ROLES } = require('../utils/constants');
const dashboard = require('../controllers/dashboard.controller');

const router = express.Router();

router.use(requireAuth, requireRole(...STAFF_ROLES));
router.get('/summary', validate(emptySchema), dashboard.summary);
router.get('/heatmap', validate(emptySchema), dashboard.heatmap);
router.get('/trends', validate(emptySchema), dashboard.trends);

module.exports = router;
