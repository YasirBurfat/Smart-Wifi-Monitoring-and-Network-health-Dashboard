const { z } = require('zod');

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id');

const dateQuery = z.string().trim().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: 'Invalid date',
});

const paging = {
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
};

function requestSchema({ body, query, params } = {}) {
  return z.object({
    body: body || z.object({}).optional().default({}),
    query: query || z.object({}).optional().default({}),
    params: params || z.object({}).optional().default({}),
  });
}

const idParams = requestSchema({
  params: z.object({ id: objectId }),
});

module.exports = {
  z,
  objectId,
  dateQuery,
  paging,
  requestSchema,
  idParams,
};
