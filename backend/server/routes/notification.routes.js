const express = require('express');
const { requireAuth } = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const { ROLES } = require('../utils/constants');
const notifications = require('../controllers/notification.controller');
const { listNotificationsSchema, emptyBodySchema, idParams } = require('../validators/notification.validators');

const router = express.Router();

router.use(requireAuth, requireRole(...ROLES));
router.get('/', validate(listNotificationsSchema), notifications.list);
router.post('/read-all', validate(emptyBodySchema), notifications.markAll);
router.patch('/:id/read', validate(idParams), notifications.markRead);

module.exports = router;
