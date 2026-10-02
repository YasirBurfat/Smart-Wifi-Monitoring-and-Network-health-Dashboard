const { z, requestSchema } = require('./common');

const score = z.coerce.number().finite().min(0).max(100);
const metric = z.coerce.number().finite().min(0).max(10000);
const points = z.coerce.number().finite().min(0).max(100);

const thresholdsSchema = z.object({
  downloadMbps: metric.optional(),
  downloadPoints: points.optional(),
  uploadMbps: metric.optional(),
  uploadPoints: points.optional(),
  pingGoodMs: metric.optional(),
  pingBadMs: metric.optional(),
  pingPoints: points.optional(),
  packetLossPercent: score.optional(),
  packetLossPoints: points.optional(),
  stabilityPoints: points.optional(),
  failurePenalty: points.optional(),
  complaintPenalty: points.optional(),
  excellentMin: score.optional(),
  goodMin: score.optional(),
  fairMin: score.optional(),
  poorMin: score.optional(),
}).strict();

const outageRuleSchema = z.object({
  minComplaints: z.coerce.number().int().min(1).max(100).optional(),
  windowMinutes: z.coerce.number().int().min(1).max(1440).optional(),
}).strict();

const updateSettingsSchema = requestSchema({
  body: z.object({
    thresholds: thresholdsSchema.optional(),
    outageRule: outageRuleSchema.optional(),
  }).refine((value) => {
    const thresholdKeys = value.thresholds ? Object.keys(value.thresholds) : [];
    const ruleKeys = value.outageRule ? Object.keys(value.outageRule) : [];
    return thresholdKeys.length > 0 || ruleKeys.length > 0;
  }, {
    message: 'Provide at least one threshold or outage rule',
  }),
});

module.exports = { updateSettingsSchema };
