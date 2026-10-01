const asyncHandler = require('../utils/asyncHandler');
const ai = require('../services/ai.service');

const anomalies = asyncHandler(async (_req, res) => {
  res.json({ ok: true, ...(await ai.detectAnomalies()) });
});

const summary = asyncHandler(async (_req, res) => {
  res.json({ ok: true, ...(await ai.buildNetworkSummary()) });
});

const recommendations = asyncHandler(async (_req, res) => {
  res.json({ ok: true, ...(await ai.recommendInspections()) });
});

const classify = asyncHandler(async (req, res) => {
  const text = req.validated.body.text || req.validated.body.description;
  const result = ai.classifyComplaint(text);
  res.json({ ok: true, ...result });
});

module.exports = { anomalies, summary, recommendations, classify };
