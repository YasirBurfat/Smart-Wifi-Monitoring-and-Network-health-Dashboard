const express = require('express');
const { requireAuth } = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const { ROLES } = require('../utils/constants');
const test = require('../controllers/test.controller');
const { createTestSchema, listTestsSchema, idParams } = require('../validators/test.validators');

const router = express.Router();

router.use(requireAuth);
router.post('/', requireRole(...ROLES), validate(createTestSchema), test.create);
router.get('/', validate(listTestsSchema), test.list);
router.get('/:id', validate(idParams), test.getOne);

module.exports = router;
