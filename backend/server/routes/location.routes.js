const express = require('express');
const { requireAuth } = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const location = require('../controllers/location.controller');
const { emptySchema } = require('../validators/common');
const {
  createLocationSchema,
  updateLocationSchema,
  idParams,
} = require('../validators/location.validators');

const router = express.Router();

router.use(requireAuth);
router.get('/', validate(emptySchema), location.list);
router.post('/', requireRole('admin', 'manager'), validate(createLocationSchema), location.create);
router.get('/:id/summary', validate(idParams), location.summary);
router.get('/:id', validate(idParams), location.getOne);
router.put('/:id', requireRole('admin', 'manager'), validate(updateLocationSchema), location.update);
router.delete('/:id', requireRole('admin', 'manager'), validate(idParams), location.remove);

module.exports = router;
