const asyncHandler = require('../utils/asyncHandler');
const analytics = require('../services/analytics.service');

const hourly = asyncHandler(async (_req, res) => {
  res.json({ ok: true, ...(await analytics.hourly()) });
});

const daily = asyncHandler(async (_req, res) => {
  const days = await analytics.daily();
  res.json({ ok: true, days });
});

const byLocation = asyncHandler(async (_req, res) => {
  const locations = await analytics.byLocation();
  res.json({ ok: true, locations });
});

const complaintsByBuilding = asyncHandler(async (_req, res) => {
  const buildings = await analytics.complaintsByBuilding();
  res.json({ ok: true, buildings });
});

const problemLocations = asyncHandler(async (_req, res) => {
  const locations = await analytics.problemLocations();
  res.json({ ok: true, locations });
});

module.exports = { hourly, daily, byLocation, complaintsByBuilding, problemLocations };
