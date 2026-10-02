const crypto = require('crypto');
const ApiError = require('../utils/ApiError');
const { SPEEDTEST_MAX_MB } = require('../utils/constants');

function download(req, res, next) {
  try {
    const raw = req.validated?.query?.size ?? req.query.size;
    let megabytes = raw == null || raw === '' ? 1 : Number(raw);
    if (!Number.isFinite(megabytes) || megabytes <= 0) {
      throw new ApiError(400, `size must be a positive number of megabytes (max ${SPEEDTEST_MAX_MB})`);
    }

    let capped = false;
    if (megabytes > SPEEDTEST_MAX_MB) {
      megabytes = SPEEDTEST_MAX_MB;
      capped = true;
    }

    const total = Math.max(1, Math.floor(megabytes * 1024 * 1024));
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', String(total));
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Pragma', 'no-cache');
    if (capped) res.setHeader('X-Speedtest-Capped', 'true');

    const chunkSize = 64 * 1024;
    let sent = 0;
    let stopped = false;
    req.on('close', () => {
      stopped = true;
    });

    function writeChunk() {
      if (stopped) return;
      while (sent < total) {
        const size = Math.min(chunkSize, total - sent);
        sent += size;
        if (!res.write(crypto.randomBytes(size))) {
          res.once('drain', writeChunk);
          return;
        }
      }
      res.end();
    }

    writeChunk();
  } catch (err) {
    next(err);
  }
}

function upload(req, res) {
  const bytesReceived = Buffer.isBuffer(req.body) ? req.body.length : 0;
  res.status(200).json({ ok: true, bytesReceived });
}

function ping(_req, res) {
  res.json({ ok: true, pong: true });
}

module.exports = { download, upload, ping };
