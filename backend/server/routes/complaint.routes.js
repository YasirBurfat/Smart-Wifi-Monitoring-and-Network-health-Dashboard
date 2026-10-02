const express = require('express');
const { requireAuth } = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const { ROLES, STAFF_ROLES } = require('../utils/constants');
const complaint = require('../controllers/complaint.controller');
const schemas = require('../validators/complaint.validators');

const router = express.Router();

router.use(requireAuth);
router.post('/', requireRole(...ROLES), validate(schemas.createComplaintSchema), complaint.create);
router.get('/', validate(schemas.listComplaintsSchema), complaint.list);
router.get('/:id', validate(schemas.idParams), complaint.getOne);
router.patch('/:id/status', requireRole(...STAFF_ROLES), validate(schemas.statusSchema), complaint.updateStatus);
router.patch('/:id/assign', requireRole(...STAFF_ROLES), validate(schemas.assignSchema), complaint.assign);
router.post('/:id/notes', requireRole(...STAFF_ROLES), validate(schemas.noteSchema), complaint.addNote);

module.exports = router;
