const Location = require('../models/Location');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { presentLocation } = require('../utils/present');
const { logActivity } = require('../services/activity.service');
const { locationSummary } = require('../services/analytics.service');

const list = asyncHandler(async (_req, res) => {
  const locations = await Location.find().sort({ building: 1, name: 1 });
  res.json({ ok: true, locations: locations.map(presentLocation) });
});

const getOne = asyncHandler(async (req, res) => {
  const location = await Location.findById(req.validated.params.id);
  if (!location) throw new ApiError(404, 'Location not found');
  res.json({ ok: true, location: presentLocation(location) });
});

const summary = asyncHandler(async (req, res) => {
  const summaryResult = await locationSummary(req.validated.params.id);
  res.json({ ok: true, summary: summaryResult });
});

const create = asyncHandler(async (req, res) => {
  const { name, building, floor, description, mapPosition } = req.validated.body;
  const location = await Location.create({
    name,
    building,
    floor: floor || '',
    description: description || '',
    mapPosition: mapPosition || { x: 0, y: 0 },
    currentStatus: 'Unknown',
  });
  await logActivity(req.user._id, 'create', 'Location', location._id, {
    name: location.name,
    building: location.building,
  });
  res.status(201).json({ ok: true, location: presentLocation(location) });
});

const update = asyncHandler(async (req, res) => {
  const location = await Location.findById(req.validated.params.id);
  if (!location) throw new ApiError(404, 'Location not found');

  const { name, building, floor, description, mapPosition } = req.validated.body;
  const before = {
    name: location.name,
    building: location.building,
    floor: location.floor,
    description: location.description,
    mapPosition: { x: location.mapPosition?.x ?? 0, y: location.mapPosition?.y ?? 0 },
  };

  if (name !== undefined) location.name = name;
  if (building !== undefined) location.building = building;
  if (floor !== undefined) location.floor = floor;
  if (description !== undefined) location.description = description;
  if (mapPosition !== undefined) location.mapPosition = { x: mapPosition.x, y: mapPosition.y };

  await location.save();
  await logActivity(req.user._id, 'update', 'Location', location._id, {
    before,
    after: {
      name: location.name,
      building: location.building,
      floor: location.floor,
      description: location.description,
      mapPosition: { x: location.mapPosition.x, y: location.mapPosition.y },
    },
  });
  res.json({ ok: true, location: presentLocation(location) });
});

const remove = asyncHandler(async (req, res) => {
  const location = await Location.findById(req.validated.params.id);
  if (!location) throw new ApiError(404, 'Location not found');
  await location.deleteOne();
  await logActivity(req.user._id, 'delete', 'Location', location._id, {
    name: location.name,
    building: location.building,
  });
  res.json({ ok: true, message: 'Location deleted' });
});

module.exports = { list, getOne, summary, create, update, remove };
