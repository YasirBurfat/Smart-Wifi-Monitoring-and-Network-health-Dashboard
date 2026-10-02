const { z, paging, requestSchema } = require('./common');

const listLogsSchema = requestSchema({
  query: z.object({
    ...paging,
    action: z.string().trim().min(1).max(40).optional(),
    entity: z.string().trim().min(1).max(40).optional(),
  }),
});

module.exports = { listLogsSchema };
