const express = require('express');
const router = express.Router();
const lokiService = require('../services/lokiService');
const zabbixService = require('../services/zabbixService');
const logger = require('../middleware/logger');

const SUPPORTED_SINCE = ['15m', '1h', '6h', '24h', '7d', '30d'];

// Input validation helpers
function validateLimit(limit) {
  if (limit === undefined || limit === null) {
    return 100; // default
  }
  const num = Number(limit);
  if (isNaN(num) || num < 0) {
    throw new Error('Invalid limit parameter');
  }
  const maxLimit = parseInt(process.env.LOKI_MAX_LIMIT || '1000', 10);
  return Math.min(num, maxLimit);
}

function validateSince(since) {
  if (!since) {
    return '24h'; // default
  }
  if (!SUPPORTED_SINCE.includes(since)) {
    throw new Error('Unsupported since parameter');
  }
  return since;
}

// GET /api/logs/recent
router.get('/recent', async (req, res) => {
  try {
    const limit = validateLimit(req.query.limit);
    const since = validateSince(req.query.since);

    const logs = await lokiService.getRecentLogs(limit, since);
    const stats = await lokiService.getLokiStats(since);

    res.json({
      success: true,
      logs,
      stats,
      data: {
        logs,
        stats
      }
    });
  } catch (err) {
    res.status(400).json({ success: false, data: null, message: err.message });
  }
});

// GET /api/logs/search
router.get('/search', async (req, res) => {
  try {
    const limit = validateLimit(req.query.limit);
    const since = validateSince(req.query.since);
    const q = req.query.q || '';

    const logs = await lokiService.searchLogs(q, limit, since);
    const stats = await lokiService.getLokiStats(since);

    res.json({
      success: true,
      logs,
      stats,
      data: {
        logs,
        stats
      }
    });
  } catch (err) {
    res.status(400).json({ success: false, data: null, message: err.message });
  }
});

// GET /api/logs/host/:hostname
router.get('/host/:hostname', async (req, res) => {
  try {
    const { hostname } = req.params;
    const limit = validateLimit(req.query.limit);
    const since = validateSince(req.query.since);

    const logs = await lokiService.getLogsByHost(hostname, limit, since);
    const stats = await lokiService.getLokiStats(since);

    res.json({
      success: true,
      logs,
      stats,
      data: {
        logs,
        stats
      }
    });
  } catch (err) {
    res.status(400).json({ success: false, data: null, message: err.message });
  }
});

// GET /api/logs/labels
router.get('/labels', async (req, res) => {
  try {
    const labels = await lokiService.getAvailableLabels();
    res.json({
      success: true,
      data: labels
    });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

// GET /api/logs/labels/:label/values
router.get('/labels/:label/values', async (req, res) => {
  try {
    const { label } = req.params;
    const values = await lokiService.getLabelValues(label);
    res.json({
      success: true,
      data: values
    });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

// GET /api/logs/correlation/:hostname
router.get('/correlation/:hostname', async (req, res) => {
  try {
    const { hostname } = req.params;
    const limit = validateLimit(req.query.limit || 100);
    // last 15 minutes
    const logs = await lokiService.getLogsByHost(hostname, limit, '15m');
    res.json({
      success: true,
      logs,
      data: logs
    });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

// GET /api/logs/event-context/:hostname
router.get('/event-context/:hostname', async (req, res) => {
  try {
    const { hostname } = req.params;
    const limit = validateLimit(req.query.limit || 100);
    const minutes = parseInt(req.query.minutes || '15', 10);
    
    if (isNaN(minutes) || minutes <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid minutes parameter' });
    }

    const logs = await lokiService.getLogsByHost(hostname, limit, `${minutes}m`);
    res.json({
      success: true,
      logs,
      data: logs
    });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

// GET /api/logs/capabilities
router.get('/capabilities', async (req, res) => {
  try {
    const capabilities = await lokiService.getLokiCapabilities();
    res.json({
      success: true,
      data: capabilities
    });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

// GET /api/logs/zabbix/:hostid
router.get('/zabbix/:hostid', async (req, res) => {
  try {
    const { hostid } = req.params;
    const limit = validateLimit(req.query.limit);
    const since = validateSince(req.query.since);

    const zabbixHosts = await zabbixService.call('host.get', {
      hostids: hostid,
      output: ['hostid', 'host', 'name']
    });

    if (!zabbixHosts || zabbixHosts.length === 0) {
      return res.status(404).json({ success: false, message: 'Zabbix host not found' });
    }

    const hostData = zabbixHosts[0];
    const hostname = hostData.name || hostData.host;

    const logs = await lokiService.getLogsByHost(hostname, limit, since);

    res.json({
      success: true,
      hostid,
      hostname,
      logs,
      data: {
        hostid,
        hostname,
        logs
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, data: null, message: err.message });
  }
});

module.exports = router;
