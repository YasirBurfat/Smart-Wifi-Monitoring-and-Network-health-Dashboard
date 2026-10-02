const express = require('express');
const { requireAuth } = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const user = require('../controllers/user.controller');
const { STAFF_ROLES } = require('../utils/constants');
const { emptySchema } = require('../validators/common');
const { createUserSchema, updateUserSchema, listUsersSchema } = require('../validators/user.validators');

const router = express.Router();

router.get('/staff', requireAuth, requireRole(...STAFF_ROLES), validate(emptySchema), user.staff);
router.use(requireAuth, requireRole('admin'));
router.get('/', validate(listUsersSchema), user.list);
router.post('/', validate(createUserSchema), user.create);
router.put('/:id', validate(updateUserSchema), user.update);

module.exports = router;
