const { z, requestSchema } = require('./common');

const name = z.string().trim().min(2).max(80);
const email = z.string().trim().email().transform((value) => value.toLowerCase());
const password = z.string().min(8).max(128);

const registerSchema = requestSchema({
  body: z.object({
    name,
    email,
    password,
  }),
});

const loginSchema = requestSchema({
  body: z.object({
    email,
    password,
  }),
});

module.exports = { registerSchema, loginSchema };
