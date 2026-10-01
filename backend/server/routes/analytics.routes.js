const express = require('express');
const { requireAuth } = require('../middleware/requireAuth');
const analytics = require('../controllers/analytics.controller');

const router = express.Router();

router.use(requireAuth);
router.get('/hourly', analytics.hourly);
router.get('/daily', analytics.daily);
router.get('/by-location', analytics.byLocation);
router.get('/complaints-by-building', analytics.complaintsByBuilding);
router.get('/problem-locations', analytics.problemLocations);

module.exports = router;
