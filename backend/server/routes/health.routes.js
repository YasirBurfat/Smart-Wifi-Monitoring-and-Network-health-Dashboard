const express = require('express');
const validate = require('../middleware/validate');
const { emptySchema } = require('../validators/common');

const router = express.Router();

router.get('/', validate(emptySchema), (_req, res) => {
  res.json({ ok: true, status: 'ok' });
});

module.exports = router;
