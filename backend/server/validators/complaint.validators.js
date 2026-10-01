const { z, objectId, dateQuery, paging, requestSchema, idParams } = require('./common');
const { COMPLAINT_STATUSES } = require('../utils/constants');

const typeField = z.string().trim().min(2).max(80);

const createComplaintSchema = requestSchema({
  body: z.object({
    locationId: objectId,
    type: typeField,
    description: z.string().trim().min(3).max(5000),
    relatedTestId: objectId.optional(),
    testId: objectId.optional(),
    attachLatestTest: z.boolean().optional(),
  }),
});

const listComplaintsSchema = requestSchema({
  query: z.object({
    ...paging,
    location: objectId.optional(),
    building: z.string().trim().min(1).max(120).optional(),
    type: typeField.optional(),
    status: z.enum(COMPLAINT_STATUSES).optional(),
    date: dateQuery.optional(),
    from: dateQuery.optional(),
    to: dateQuery.optional(),
  }),
});

const statusSchema = requestSchema({
  params: idParams.shape.params,
  body: z.object({
    status: z.enum(COMPLAINT_STATUSES),
    assigneeId: objectId.optional(),
    assignee: z.string().trim().max(120).optional(),
  }),
});

const assignSchema = requestSchema({
  params: idParams.shape.params,
  body: z.object({
    assigneeId: objectId.optional(),
    assignee: z.string().trim().min(1).max(120).optional(),
  }).refine((value) => value.assigneeId || value.assignee, {
    message: 'Assignee is required',
    path: ['assigneeId'],
  }),
});

const noteSchema = requestSchema({
  params: idParams.shape.params,
  body: z.object({
    text: z.string().trim().min(1).max(2000).optional(),
    note: z.string().trim().min(1).max(2000).optional(),
  }).refine((value) => value.text || value.note, {
    message: 'Note text is required',
    path: ['text'],
  }),
});

module.exports = {
  createComplaintSchema,
  listComplaintsSchema,
  statusSchema,
  assignSchema,
  noteSchema,
  idParams,
};
