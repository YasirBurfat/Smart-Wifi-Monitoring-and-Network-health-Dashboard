const express = require('express');
const { requireAuth } = require('../middleware/requireAuth');
const validate = require('../middleware/validate');
const ai = require('../controllers/ai.controller');
const { classifySchema } = require('../validators/ai.validators');

const router = express.Router();

router.use(requireAuth);
router.get('/anomalies', ai.anomalies);
router.get('/summary', ai.summary);
router.get('/recommendations', ai.recommendations);
router.post('/classify', validate(classifySchema), ai.classify);

module.exports = router;
