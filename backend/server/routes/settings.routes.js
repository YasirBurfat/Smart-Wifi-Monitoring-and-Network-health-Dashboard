const express = require('express');
const { requireAuth } = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const settings = require('../controllers/settings.controller');
const { emptySchema } = require('../validators/common');
const { updateSettingsSchema } = require('../validators/settings.validators');

const router = express.Router();

router.use(requireAuth, requireRole('admin'));
router.get('/', validate(emptySchema), settings.get);
router.put('/', validate(updateSettingsSchema), settings.update);

module.exports = router;
