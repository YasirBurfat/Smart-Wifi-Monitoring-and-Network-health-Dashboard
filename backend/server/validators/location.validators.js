const { z, requestSchema, idParams } = require('./common');

const mapPosition = z.object({
  x: z.coerce.number().finite(),
  y: z.coerce.number().finite(),
});

const floor = z.union([z.string(), z.number()]).optional().transform((value) => {
  if (value == null) return undefined;
  const text = String(value).trim();
  return text;
});

const locationFields = {
  name: z.string().trim().min(1).max(120),
  building: z.string().trim().min(1).max(120),
  floor: floor.optional(),
  description: z.string().trim().max(2000).optional(),
  mapPosition: mapPosition.optional(),
};

const createLocationSchema = requestSchema({
  body: z.object({
    name: locationFields.name,
    building: locationFields.building,
    floor: locationFields.floor,
    description: locationFields.description,
    mapPosition: locationFields.mapPosition,
  }),
});

const updateLocationSchema = requestSchema({
  params: idParams.shape.params,
  body: z.object({
    name: locationFields.name.optional(),
    building: locationFields.building.optional(),
    floor: locationFields.floor,
    description: locationFields.description,
    mapPosition: locationFields.mapPosition,
  }).refine((value) => Object.values(value).some((item) => item !== undefined), {
    message: 'Provide at least one field to update',
  }),
});

module.exports = {
  createLocationSchema,
  updateLocationSchema,
  idParams,
};
