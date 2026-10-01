const Test = require('../models/Test');
const Location = require('../models/Location');
const { getSettings } = require('./setting.service');
const { logActivity } = require('./activity.service');
const { DEFAULT_THRESHOLDS } = require('../utils/constants');
const { roundTo } = require('../utils/numbers');

function withThresholds(thresholds) {
  return { ...DEFAULT_THRESHOLDS, ...(thresholds || {}) };
}

function bandFromScore(score, thresholds) {
  const t = withThresholds(thresholds);
  if (score >= t.excellentMin) return 'Excellent';
  if (score >= t.goodMin) return 'Good';
  if (score >= t.fairMin) return 'Fair';
  if (score >= t.poorMin) return 'Poor';
  return 'Critical';
}

/**
 * Score a speed sample. Component caps and targets come from Setting thresholds.
 * Download max 30, upload max 15, ping max 25, packet loss max 20, stability max 10.
 * recentFailures and recentComplaints are counts from the previous 24 hours.
 */
function computeScore(metrics, recentFailures = 0, recentComplaints = 0, thresholds) {
  const t = withThresholds(thresholds);
  const download = Number(metrics.download) || 0;
  const upload = Number(metrics.upload) || 0;
  const ping = Number(metrics.ping) || 0;
  const packetLoss = Number(metrics.packetLoss) || 0;
  const failures = Math.max(0, Number(recentFailures) || 0);
  const complaints = Math.max(0, Number(recentComplaints) || 0);

  const downloadScore = t.downloadMbps > 0
    ? Math.min(download / t.downloadMbps, 1) * t.downloadPoints
    : 0;
  const uploadScore = t.uploadMbps > 0
    ? Math.min(upload / t.uploadMbps, 1) * t.uploadPoints
    : 0;

  let pingScore = 0;
  if (ping <= t.pingGoodMs) {
    pingScore = t.pingPoints;
  } else if (ping >= t.pingBadMs) {
    pingScore = 0;
  } else if (t.pingBadMs > t.pingGoodMs) {
    pingScore = t.pingPoints * (1 - (ping - t.pingGoodMs) / (t.pingBadMs - t.pingGoodMs));
  }

  const lossScore = t.packetLossPercent > 0
    ? t.packetLossPoints * (1 - Math.min(packetLoss / t.packetLossPercent, 1))
    : 0;

  const stability = Math.max(
    0,
    t.stabilityPoints - t.failurePenalty * failures - t.complaintPenalty * complaints
  );

  const score = roundTo(downloadScore + uploadScore + pingScore + lossScore + stability, 1);
  const band = bandFromScore(score, t);

  return {
    score,
    band,
    components: {
      download: roundTo(downloadScore, 1),
      upload: roundTo(uploadScore, 1),
      ping: roundTo(pingScore, 1),
      packetLoss: roundTo(lossScore, 1),
      stability: roundTo(stability, 1),
    },
  };
}

async function refreshLocationStatus(locationId, actorId) {
  const recent = await Test.find({ location: locationId })
    .sort({ createdAt: -1 })
    .limit(5)
    .select('score');

  const settings = await getSettings();
  let currentStatus = 'Unknown';
  if (recent.length) {
    const average = recent.reduce((sum, test) => sum + test.score, 0) / recent.length;
    currentStatus = bandFromScore(average, settings.thresholds);
  }

  const location = await Location.findById(locationId);
  if (!location) return null;
  if (location.currentStatus === currentStatus) return location;

  const from = location.currentStatus;
  location.currentStatus = currentStatus;
  await location.save();
  if (actorId) {
    await logActivity(actorId, 'status_change', 'Location', location._id, {
      from,
      to: currentStatus,
      sampleSize: recent.length,
    });
  }
  return location;
}

module.exports = {
  computeScore,
  bandFromScore,
  refreshLocationStatus,
};
