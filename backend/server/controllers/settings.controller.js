const asyncHandler = require('../utils/asyncHandler');
const { getSettings, updateSettings } = require('../services/setting.service');

const get = asyncHandler(async (_req, res) => {
  const settings = await getSettings();
  res.json({ ok: true, settings });
});

const update = asyncHandler(async (req, res) => {
  const result = await updateSettings(req.validated.body, req.user._id);
  res.json({ ok: true, settings: result.settings, locations: result.locations });
});

module.exports = { get, update };
