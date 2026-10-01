const { z, objectId, paging, requestSchema, idParams } = require('./common');
const { OUTAGE_STATUSES } = require('../utils/constants');

const listOutagesSchema = requestSchema({
  query: z.object({
    ...paging,
    location: objectId.optional(),
    building: z.string().trim().min(1).max(120).optional(),
    status: z.enum(OUTAGE_STATUSES).optional(),
    type: z.string().trim().min(1).max(80).optional(),
  }),
});

const updateOutageSchema = requestSchema({
  params: idParams.shape.params,
  body: z.object({
    status: z.enum(OUTAGE_STATUSES),
  }),
});

module.exports = { listOutagesSchema, updateOutageSchema };
