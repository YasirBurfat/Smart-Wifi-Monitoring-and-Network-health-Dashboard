const { z, requestSchema } = require('./common');

const classifySchema = requestSchema({
  body: z.object({
    text: z.string().trim().min(1).max(5000).optional(),
    description: z.string().trim().min(1).max(5000).optional(),
  }).refine((value) => value.text || value.description, {
    message: 'text is required',
    path: ['text'],
  }),
});

module.exports = { classifySchema };
