const express = require('express');
const { z, requestSchema } = require('../validators/common');
const validate = require('../middleware/validate');
const { SPEEDTEST_MAX_MB } = require('../utils/constants');
const speedtest = require('../controllers/speedtest.controller');

const router = express.Router();

const downloadSchema = requestSchema({
  query: z.object({
    size: z.coerce.number().finite().positive().max(SPEEDTEST_MAX_MB).optional(),
  }),
});

const byteSchema = z.object({
  body: z.any(),
  query: z.record(z.string()).optional().default({}),
  params: z.object({}).optional().default({}),
});

router.get('/download', validate(downloadSchema), speedtest.download);
router.post('/upload', validate(byteSchema), speedtest.upload);
router.get('/ping', validate(byteSchema), speedtest.ping);

module.exports = router;
