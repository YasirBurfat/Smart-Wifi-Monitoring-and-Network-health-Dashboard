const express = require('express');
const { requireAuth } = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const { STAFF_ROLES } = require('../utils/constants');
const outage = require('../controllers/outage.controller');
const { listOutagesSchema, updateOutageSchema } = require('../validators/outage.validators');

const router = express.Router();

router.use(requireAuth);
router.get('/', validate(listOutagesSchema), outage.list);
router.patch('/:id', requireRole(...STAFF_ROLES), validate(updateOutageSchema), outage.update);

module.exports = router;
