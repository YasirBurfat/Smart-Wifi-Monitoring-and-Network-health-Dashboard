const Test = require('../models/Test');
const Complaint = require('../models/Complaint');
const Outage = require('../models/Outage');
const Location = require('../models/Location');
const { daysAgo } = require('../utils/dates');
const { roundTo, clamp } = require('../utils/numbers');
const { PROBLEM_BANDS, COMPLAINT_CATEGORIES } = require('../utils/constants');

const CATEGORY_RULES = [
  {
    name: 'no connection',
    keywords: ['no connection', 'no internet', 'cannot connect', "can't connect", 'cant connect', 'no wifi', 'no wi-fi', 'not connecting', 'offline'],
  },
  {
    name: 'wifi dropping',
    keywords: ['dropping', 'keeps disconnecting', 'disconnects', 'cuts out', 'wifi drops', 'wi-fi drops', 'keeps dropping', 'unstable'],
  },
  {
    name: 'login/authentication',
    keywords: ['login', 'log in', 'password', 'authentication', 'authenticate', 'sign in', 'signin', 'credential', 'captive portal'],
  },
  {
    name: 'high latency',
    keywords: ['latency', 'high ping', 'ping', 'lag', 'jitter', 'delay'],
  },
  {
    name: 'hardware/access point',
    keywords: ['access point', 'router', 'hardware', 'antenna', 'switch', 'ap offline', 'cable'],
  },
  {
    name: 'slow internet',
    keywords: ['slow', 'buffering', 'speed', 'throughput', 'bandwidth', 'loading'],
  },
];

function keywordHits(text, keyword) {
  const haystack = text.toLowerCase();
  const needle = keyword.toLowerCase();
  if (/[^a-z0-9\s]/i.test(needle) || needle.includes(' ')) {
    return haystack.includes(needle);
  }
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escaped}\\b`, 'i').test(haystack);
}

function classifyComplaint(text) {
  const scores = {};
  const matches = {};
  for (const category of COMPLAINT_CATEGORIES) {
    scores[category] = 0;
    matches[category] = [];
  }

  for (const rule of CATEGORY_RULES) {
    for (const keyword of rule.keywords) {
      if (keywordHits(text, keyword)) {
        scores[rule.name] += keyword.length;
        matches[rule.name].push(keyword);
      }
    }
  }

  let category = 'other';
  let best = 0;
  for (const rule of CATEGORY_RULES) {
    if (scores[rule.name] > best) {
      best = scores[rule.name];
      category = rule.name;
    }
  }

  return { category, scores, matches: matches[category] || [] };
}

function populationStats(values) {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return { mean, stdDev: Math.sqrt(variance) };
}

async function detectAnomalies() {
  const since = daysAgo(14);
  const rows = await Test.aggregate([
    { $match: { createdAt: { $gte: since } } },
    {
      $group: {
        _id: {
          location: '$location',
          day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'UTC' } },
        },
        averageScore: { $avg: '$score' },
        testCount: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: Location.collection.collectionName,
        localField: '_id.location',
        foreignField: '_id',
        as: 'location',
      },
    },
    { $unwind: { path: '$location', preserveNullAndEmptyArrays: true } },
  ]);

  const byLocation = new Map();
  for (const row of rows) {
    const key = String(row._id.location);
    if (!byLocation.has(key)) {
      byLocation.set(key, {
        locationId: row._id.location,
        locationName: row.location?.name || 'Unknown location',
        building: row.location?.building || '',
        days: [],
      });
    }
    byLocation.get(key).days.push({
      date: row._id.day,
      value: row.averageScore,
      testCount: row.testCount,
    });
  }

  const anomalies = [];
  for (const group of byLocation.values()) {
    if (group.days.length < 3) continue;
    const stats = populationStats(group.days.map((day) => day.value));
    if (!stats.stdDev) continue;
    for (const day of group.days) {
      const zScore = (day.value - stats.mean) / stats.stdDev;
      if (Math.abs(zScore) > 2) {
        anomalies.push({
          locationId: group.locationId,
          locationName: group.locationName,
          building: group.building,
          date: day.date,
          metric: 'score',
          value: roundTo(day.value, 1),
          mean: roundTo(stats.mean, 1),
          stdDev: roundTo(stats.stdDev, 2),
          zScore: roundTo(zScore, 2),
          testCount: day.testCount,
        });
      }
    }
  }

  anomalies.sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore));
  return { windowDays: 14, metric: 'score', threshold: 2, anomalies };
}

function worstHourSentence(worstHour) {
  if (!worstHour) {
    return 'There is not enough data to name a worst hour.';
  }
  const label = `${String(worstHour.hour).padStart(2, '0')}:00 UTC`;
  return `The worst hour was ${label} with an average score of ${worstHour.averageScore}.`;
}

function buildTemplate(stats) {
  if (!stats.tests) {
    return `No speed tests were recorded in the last 3 days. ${worstHourSentence(null)}`;
  }
  const scoreText = stats.averageScore == null
    ? 'no average score'
    : `an average health score of ${stats.averageScore}`;
  const complaintText = stats.complaints === 1 ? '1 complaint was filed' : `${stats.complaints} complaints were filed`;
  const outageText = stats.activeOutages === 1 ? '1 outage is active' : `${stats.activeOutages} outages are active`;
  return `Over the last 3 days the campus network recorded ${stats.tests} tests with ${scoreText}. ${complaintText} and ${outageText}. ${worstHourSentence(stats.worstHour)}`;
}

async function maybePolish(template) {
  const apiKey = (process.env.XAI_API_KEY || '').trim();
  if (!apiKey) {
    return { text: template, source: 'template' };
  }

  try {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.XAI_MODEL || 'grok-3',
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content: 'You polish campus network operations summaries. Keep every number, hour, and fact exactly the same. Do not invent data. Reply with one short paragraph.',
          },
          { role: 'user', content: template },
        ],
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      throw new Error(`xAI request failed with status ${response.status}`);
    }
    const payload = await response.json();
    const text = payload?.choices?.[0]?.message?.content;
    if (!text || !String(text).trim()) {
      throw new Error('xAI response was empty');
    }
    return { text: String(text).trim(), source: 'xai' };
  } catch (err) {
    console.error('xAI summary polish failed; using template text');
    return { text: template, source: 'template' };
  }
}

async function buildNetworkSummary() {
  const since = daysAgo(3);
  const [testRows, complaintRows, outageRows] = await Promise.all([
    Test.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $facet: {
          overall: [
            {
              $group: {
                _id: null,
                tests: { $sum: 1 },
                averageScore: { $avg: '$score' },
                averageDownload: { $avg: '$download' },
              },
            },
          ],
          byHour: [
            {
              $group: {
                _id: { $hour: { date: '$createdAt', timezone: 'UTC' } },
                averageScore: { $avg: '$score' },
                averageDownload: { $avg: '$download' },
                testCount: { $sum: 1 },
              },
            },
            { $sort: { averageScore: 1, averageDownload: 1, _id: 1 } },
            { $limit: 1 },
          ],
        },
      },
    ]),
    Complaint.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $count: 'count' },
    ]),
    Outage.aggregate([
      { $match: { status: 'active' } },
      { $count: 'count' },
    ]),
  ]);

  const facet = testRows[0] || { overall: [], byHour: [] };
  const overall = facet.overall[0] || null;
  const hour = facet.byHour[0] || null;
  const stats = {
    tests: overall?.tests || 0,
    averageScore: overall ? roundTo(overall.averageScore, 1) : null,
    averageDownload: overall ? roundTo(overall.averageDownload, 1) : null,
    complaints: complaintRows[0]?.count || 0,
    activeOutages: outageRows[0]?.count || 0,
    worstHour: hour
      ? {
        hour: hour._id,
        averageScore: roundTo(hour.averageScore, 1),
        averageDownload: roundTo(hour.averageDownload, 1),
        testCount: hour.testCount,
      }
      : null,
  };

  const template = buildTemplate(stats);
  const polished = await maybePolish(template);
  return {
    windowDays: 3,
    summary: polished.text,
    source: polished.source,
    stats,
  };
}

function average(values) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function recommendationReason(parts) {
  const reasons = [];
  if (parts.poorTestRatio > 0) {
    reasons.push(`Poor or critical results on ${Math.round(parts.poorTestRatio * 100)}% of recent tests.`);
  }
  if (parts.normalizedComplaints > 0) {
    reasons.push('Complaint volume is high relative to other locations.');
  }
  if (parts.downtrend > 0) {
    reasons.push('Download speed is below the recent average for this location.');
  }
  if (!reasons.length) {
    return 'No significant issues detected in the last 7 days.';
  }
  return reasons.join(' ');
}

async function recommendInspections() {
  const since = daysAgo(7);
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const locations = await Location.aggregate([
    {
      $lookup: {
        from: Test.collection.collectionName,
        let: { id: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [{ $eq: ['$location', '$$id'] }, { $gte: ['$createdAt', since] }],
              },
            },
          },
          { $project: { download: 1, band: 1, createdAt: 1, score: 1 } },
        ],
        as: 'recentTests',
      },
    },
    {
      $lookup: {
        from: Complaint.collection.collectionName,
        let: { id: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [{ $eq: ['$location', '$$id'] }, { $gte: ['$createdAt', since] }],
              },
            },
          },
          { $count: 'count' },
        ],
        as: 'complaintStats',
      },
    },
    {
      $project: {
        name: 1,
        building: 1,
        floor: 1,
        currentStatus: 1,
        recentTests: 1,
        complaintCount: { $ifNull: [{ $arrayElemAt: ['$complaintStats.count', 0] }, 0] },
      },
    },
  ]);

  const maxComplaints = locations.reduce((max, location) => Math.max(max, location.complaintCount), 0);

  const recommendations = locations.map((location) => {
    const tests = location.recentTests || [];
    const poor = tests.filter((test) => PROBLEM_BANDS.includes(test.band)).length;
    const poorTestRatio = tests.length ? poor / tests.length : 0;
    const normalizedComplaints = maxComplaints > 0 ? location.complaintCount / maxComplaints : 0;
    const weekAverage = average(tests.map((test) => test.download));
    const lastDay = tests.filter((test) => new Date(test.createdAt) >= dayAgo);
    const recentValues = lastDay.length ? lastDay.map((test) => test.download) : [];
    let recentAverage = average(recentValues);
    if (recentAverage == null && tests.length) {
      const latest = [...tests].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
      recentAverage = latest.download;
    }
    let downtrend = 0;
    if (weekAverage && recentAverage != null) {
      downtrend = clamp((weekAverage - recentAverage) / weekAverage, 0, 1);
    }

    const priority = roundTo(
      0.5 * poorTestRatio + 0.3 * normalizedComplaints + 0.2 * downtrend,
      4
    );

    const parts = {
      poorTestRatio: roundTo(poorTestRatio, 4),
      normalizedComplaints: roundTo(normalizedComplaints, 4),
      downtrend: roundTo(downtrend, 4),
    };

    return {
      locationId: location._id,
      name: location.name,
      building: location.building,
      floor: location.floor || '',
      currentStatus: location.currentStatus,
      priority,
      ...parts,
      testCount: tests.length,
      complaintCount: location.complaintCount,
      reason: recommendationReason(parts),
    };
  });

  recommendations.sort((a, b) => b.priority - a.priority || a.name.localeCompare(b.name));
  return { windowDays: 7, recommendations };
}

module.exports = {
  classifyComplaint,
  detectAnomalies,
  buildNetworkSummary,
  recommendInspections,
};
