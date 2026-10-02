const express = require('express');
const { requireAuth } = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const { emptySchema } = require('../validators/common');
const { STAFF_ROLES } = require('../utils/constants');
const analytics = require('../controllers/analytics.controller');

const router = express.Router();

router.use(requireAuth, requireRole(...STAFF_ROLES));
router.get('/hourly', validate(emptySchema), analytics.hourly);
router.get('/daily', validate(emptySchema), analytics.daily);
router.get('/by-location', validate(emptySchema), analytics.byLocation);
router.get('/complaints-by-building', validate(emptySchema), analytics.complaintsByBuilding);
router.get('/problem-locations', validate(emptySchema), analytics.problemLocations);

module.exports = router;
