const express = require('express');
const { requireAuth } = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const user = require('../controllers/user.controller');
const { createUserSchema, updateUserSchema, listUsersSchema } = require('../validators/user.validators');

const router = express.Router();

router.use(requireAuth, requireRole('admin'));
router.get('/', validate(listUsersSchema), user.list);
router.post('/', validate(createUserSchema), user.create);
router.put('/:id', validate(updateUserSchema), user.update);

module.exports = router;
