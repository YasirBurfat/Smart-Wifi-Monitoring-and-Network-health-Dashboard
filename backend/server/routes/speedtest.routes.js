const express = require('express');
const { requireAuth } = require('../middleware/requireAuth');
const speedtest = require('../controllers/speedtest.controller');

const router = express.Router();

router.use(requireAuth);
router.get('/download', speedtest.download);
router.post('/upload', speedtest.upload);
router.get('/ping', speedtest.ping);

module.exports = router;
