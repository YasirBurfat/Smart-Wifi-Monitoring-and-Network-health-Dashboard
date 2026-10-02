const express = require('express');
const { requireAuth } = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const logs = require('../controllers/log.controller');
const { listLogsSchema } = require('../validators/log.validators');

const router = express.Router();

router.use(requireAuth, requireRole('admin'));
router.get('/', validate(listLogsSchema), logs.list);

module.exports = router;
