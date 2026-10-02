const { z, objectId, dateQuery, paging, requestSchema, idParams } = require('./common');
const { BANDS } = require('../utils/constants');

const metric = z.coerce.number().finite().min(0).max(10000);
const loss = z.coerce.number().finite().min(0).max(100);

const createTestSchema = requestSchema({
  body: z.object({
    locationId: objectId,
    download: metric.optional(),
    upload: metric.optional(),
    ping: metric.optional(),
    downloadMbps: metric.optional(),
    uploadMbps: metric.optional(),
    pingMs: metric.optional(),
    packetLoss: loss,
    jitterMs: metric.optional(),
    failed: z.boolean().optional(),
    completed: z.boolean().optional(),
  }).superRefine((value, ctx) => {
    if (value.download == null && value.downloadMbps == null) {
      ctx.addIssue({ code: 'custom', path: ['download'], message: 'download is required' });
    }
    if (value.upload == null && value.uploadMbps == null) {
      ctx.addIssue({ code: 'custom', path: ['upload'], message: 'upload is required' });
    }
    if (value.ping == null && value.pingMs == null) {
      ctx.addIssue({ code: 'custom', path: ['ping'], message: 'ping is required' });
    }
  }),
});

const listTestsSchema = requestSchema({
  query: z.object({
    ...paging,
    location: objectId.optional(),
    building: z.string().trim().min(1).max(120).optional(),
    status: z.enum(BANDS).optional(),
    from: dateQuery.optional(),
    to: dateQuery.optional(),
    userId: objectId.optional(),
  }),
});

module.exports = { createTestSchema, listTestsSchema, idParams };
