const asyncHandler = require('../utils/asyncHandler');
const analytics = require('../services/analytics.service');

const summary = asyncHandler(async (_req, res) => {
  const summaryResult = await analytics.dashboardSummary();
  res.json({ ok: true, summary: summaryResult });
});

const heatmap = asyncHandler(async (_req, res) => {
  const locations = await analytics.dashboardHeatmap();
  res.json({ ok: true, locations });
});

const trends = asyncHandler(async (_req, res) => {
  const days = await analytics.dashboardTrends();
  res.json({ ok: true, days });
});

module.exports = { summary, heatmap, trends };
