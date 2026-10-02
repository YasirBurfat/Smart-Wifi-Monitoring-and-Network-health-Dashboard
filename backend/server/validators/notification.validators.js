const { z, paging, requestSchema, idParams } = require('./common');

const listNotificationsSchema = requestSchema({
  query: z.object({
    ...paging,
    unread: z.enum(['true', 'false']).optional(),
  }),
});

const emptyBodySchema = requestSchema({
  body: z.object({}).optional().default({}),
});

module.exports = { listNotificationsSchema, emptyBodySchema, idParams };
