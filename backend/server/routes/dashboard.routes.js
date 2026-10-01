const express = require('express');
const { requireAuth } = require('../middleware/requireAuth');
const dashboard = require('../controllers/dashboard.controller');

const router = express.Router();

router.use(requireAuth);
router.get('/summary', dashboard.summary);
router.get('/heatmap', dashboard.heatmap);
router.get('/trends', dashboard.trends);

module.exports = router;
