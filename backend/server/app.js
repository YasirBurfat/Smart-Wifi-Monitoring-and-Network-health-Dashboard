const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { allowedOrigins } = require('./config/env');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const healthRoutes = require('./routes/health.routes');
const authRoutes = require('./routes/auth.routes');
const locationRoutes = require('./routes/location.routes');
const userRoutes = require('./routes/user.routes');
const speedtestRoutes = require('./routes/speedtest.routes');
const testRoutes = require('./routes/test.routes');
const complaintRoutes = require('./routes/complaint.routes');
const outageRoutes = require('./routes/outage.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const aiRoutes = require('./routes/ai.routes');
const settingsRoutes = require('./routes/settings.routes');
const logRoutes = require('./routes/log.routes');
const notificationRoutes = require('./routes/notification.routes');

const app = express();

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(null, false);
  },
  credentials: true,
}));
app.use(morgan('dev'));

const jsonParser = express.json({ limit: '1mb' });
const rawParser = express.raw({ type: () => true, limit: '25mb' });

app.use((req, res, next) => {
  if (req.method === 'POST' && req.path === '/api/speedtest/upload') {
    rawParser(req, res, next);
    return;
  }
  jsonParser(req, res, next);
});

app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/speedtest', speedtestRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/outages', outageRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/notifications', notificationRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
