const { z, requestSchema, idParams, paging } = require('./common');
const { ROLES, ACCOUNT_STATUSES } = require('../utils/constants');

const createUserSchema = requestSchema({
  body: z.object({
    name: z.string().trim().min(2).max(80),
    email: z.string().trim().email().transform((value) => value.toLowerCase()),
    password: z.string().min(8).max(128),
    role: z.enum(ROLES),
    accountStatus: z.enum(ACCOUNT_STATUSES).optional(),
  }),
});

const updateUserSchema = requestSchema({
  params: idParams.shape.params,
  body: z.object({
    role: z.enum(ROLES).optional(),
    accountStatus: z.enum(ACCOUNT_STATUSES).optional(),
  }).refine((value) => value.role !== undefined || value.accountStatus !== undefined, {
    message: 'Provide a role or an account status',
  }),
});

const listUsersSchema = requestSchema({
  query: z.object(paging),
});

module.exports = { createUserSchema, updateUserSchema, listUsersSchema, idParams };
