const axios = require('axios');
const logger = require('../middleware/logger');

const LOKI_URL = process.env.LOKI_URL || 'http://192.168.1.180:3100';
const LOKI_TIMEOUT = parseInt(process.env.LOKI_TIMEOUT || '10000', 10);
const LOKI_CACHE_TTL = parseInt(process.env.LOKI_CACHE_TTL || '300', 10);

const lokiClient = axios.create({
  baseURL: LOKI_URL,
  timeout: LOKI_TIMEOUT,
  headers: {
    'Accept': 'application/json'
  }
});

// Cache for labels and label values
let cachedLabels = null;
let cachedLabelsExpiry = 0;
const cachedLabelValues = {}; // key: label, value: { values, expiry }

// Discovered labels during runtime
let discoveredLabels = [];

/**
 * Fetch all available labels from Loki with caching
 */
async function getAvailableLabels() {
  const now = Math.floor(Date.now() / 1000);
  if (cachedLabels && now < cachedLabelsExpiry) {
    return cachedLabels;
  }

  try {
    const res = await lokiClient.get('/loki/api/v1/labels');
    if (res.data && res.data.status === 'success' && Array.isArray(res.data.data)) {
      discoveredLabels = res.data.data;
      cachedLabels = res.data.data;
      cachedLabelsExpiry = now + LOKI_CACHE_TTL;
      return cachedLabels;
    }
  } catch (err) {
    logger.error(`Failed to fetch Loki labels: ${err.message}`);
    // Safe fallback to memory/empty
    if (cachedLabels) return cachedLabels;
  }
  return discoveredLabels.length ? discoveredLabels : ['job', 'host', 'hostname', 'instance', 'filename'];
}

/**
 * Fetch all unique values for a label with caching
 */
async function getLabelValues(label) {
  const now = Math.floor(Date.now() / 1000);
  const cached = cachedLabelValues[label];
  if (cached && now < cached.expiry) {
    return cached.values;
  }

  try {
    const res = await lokiClient.get(`/loki/api/v1/label/${encodeURIComponent(label)}/values`);
    if (res.data && res.data.status === 'success' && Array.isArray(res.data.data)) {
      cachedLabelValues[label] = {
        values: res.data.data,
        expiry: now + LOKI_CACHE_TTL
      };
      return res.data.data;
    }
  } catch (err) {
    logger.error(`Failed to fetch Loki label values for ${label}: ${err.message}`);
    if (cached) return cached.values;
  }
  return [];
}

/**
 * Helper helpers for label detection
 */
function detectLabel(availableLabels, priorityList, defaultVal) {
  for (const p of priorityList) {
    if (availableLabels.includes(p)) {
      return p;
    }
  }
  return defaultVal;
}

async function detectHostLabel() {
  const labels = await getAvailableLabels();
  return detectLabel(labels, ["host", "hostname", "instance", "nodename"], "host");
}

async function detectFilenameLabel() {
  const labels = await getAvailableLabels();
  return detectLabel(labels, ["filename", "path", "logfile"], "filename");
}

async function detectJobLabel() {
  const labels = await getAvailableLabels();
  return detectLabel(labels, ["job", "service", "app"], "job");
}

/**
 * Build dynamic base LogQL selector
 */
async function buildBaseSelector() {
  const filenameLabel = await detectFilenameLabel();
  const labels = await getAvailableLabels();
  if (labels.includes(filenameLabel)) {
    return `{${filenameLabel}=~".+"}`;
  }
  // Try fallback to job label or host label if they exist in discovered labels
  const jobLabel = await detectJobLabel();
  if (labels.includes(jobLabel)) {
    return `{${jobLabel}=~".+"}`;
  }
  const hostLabel = await detectHostLabel();
  if (labels.includes(hostLabel)) {
    return `{${hostLabel}=~".+"}`;
  }
  return '{}';
}

/**
 * Return capabilities for frontend
 */
async function getLokiCapabilities() {
  const hostLabel = await detectHostLabel();
  const filenameLabel = await detectFilenameLabel();
  const jobLabel = await detectJobLabel();
  const availableLabels = await getAvailableLabels();
  return {
    hostLabel,
    filenameLabel,
    jobLabel,
    availableLabels
  };
}

/**
 * Formats Loki values [timestamp_nano, text] and stream labels into the unified NMS format
 */
function formatLokiResponse(lokiData, hostLabel, filenameLabel, jobLabel) {
  const result = [];
  if (!lokiData || !lokiData.data || !lokiData.data.result) return result;

  for (const item of lokiData.data.result) {
    const stream = item.stream || {};
    const hostVal = stream[hostLabel] || stream.host || stream.hostname || stream.instance || 'unknown';
    const jobVal = stream[jobLabel] || stream.job || 'unknown';
    const fileVal = stream[filenameLabel] || stream.filename || 'unknown';

    if (item.values && Array.isArray(item.values)) {
      for (const val of item.values) {
        const nanoStr = val[0];
        const message = val[1];
        // nano epoch to MS
        const ms = Math.floor(Number(nanoStr) / 1000000);
        const timestamp = new Date(ms).toISOString();

        result.push({
          timestamp,
          message,
          host: hostVal,
          job: jobVal,
          filename: fileVal,
          labels: stream
        });
      }
    }
  }

  // Sort descending
  return result.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

/**
 * Execute a query_range against Loki
 */
async function queryRange({ query, limit, since }) {
  try {
    const params = {
      query,
      limit,
      direction: 'backward'
    };
    if (since) {
      params.since = since;
    }
    const res = await lokiClient.get('/loki/api/v1/query_range', { params });
    const hostLabel = await detectHostLabel();
    const filenameLabel = await detectFilenameLabel();
    const jobLabel = await detectJobLabel();
    return formatLokiResponse(res.data, hostLabel, filenameLabel, jobLabel);
  } catch (err) {
    logger.error(`Loki queryRange failed (Query: ${query}): ${err.message}`);
    throw err;
  }
}

/**
 * API function implementations
 */
async function getRecentLogs(limit, since) {
  const selector = await buildBaseSelector();
  return queryRange({ query: selector, limit, since });
}

async function searchLogs(searchText, limit, since) {
  const selector = await buildBaseSelector();
  const query = searchText ? `${selector} |= "${searchText}"` : selector;
  return queryRange({ query, limit, since });
}

async function getLogsByHost(hostname, limit, since) {
  const hostLabel = await detectHostLabel();
  const query = `{${hostLabel}="${hostname}"}`;
  try {
    return await queryRange({ query, limit, since });
  } catch (err) {
    // Dynamic query fallback to string matching on selector if host stream query fails
    const selector = await buildBaseSelector();
    const fallbackQuery = `${selector} |= "${hostname}"`;
    logger.warn(`Loki host stream query failed for ${hostname}, trying text fallback query: ${fallbackQuery}`);
    return await queryRange({ query: fallbackQuery, limit, since });
  }
}

async function getLogsByLabel(label, value, limit, since) {
  const query = `{${label}="${value}"}`;
  return queryRange({ query, limit, since });
}

/**
 * Fetch statistics using Loki metric queries in parallel
 */
async function getLokiStats(since) {
  const selector = await buildBaseSelector();
  const metrics = {
    total: `sum(count_over_time(${selector}[${since}]))`,
    errors: `sum(count_over_time(${selector} |= "error" [${since}]))`,
    warnings: `sum(count_over_time(${selector} |= "warning" [${since}]))`,
    critical: `sum(count_over_time(${selector} |= "critical" [${since}]))`
  };

  const getMetricValue = async (query) => {
    try {
      const res = await lokiClient.get('/loki/api/v1/query', { params: { query } });
      if (
        res.data &&
        res.data.status === 'success' &&
        res.data.data &&
        res.data.data.result &&
        res.data.data.result.length > 0
      ) {
        const val = res.data.data.result[0].value;
        if (val && val[1]) {
          return parseInt(val[1], 10) || 0;
        }
      }
    } catch (err) {
      logger.error(`Failed to fetch Loki metric query "${query}": ${err.message}`);
    }
    return 0;
  };

  const [total, errors, warnings, critical] = await Promise.all([
    getMetricValue(metrics.total),
    getMetricValue(metrics.errors),
    getMetricValue(metrics.warnings),
    getMetricValue(metrics.critical)
  ]);

  return {
    total,
    errors,
    warnings,
    critical
  };
}

/**
 * Startup checks
 */
async function checkLokiConnection() {
  try {
    const res = await lokiClient.get('/ready');
    return res.data.trim() === 'ready';
  } catch (err) {
    logger.error(`Loki connection check failed: ${err.message}`);
    return false;
  }
}

// Trigger initial label loading
getAvailableLabels().catch(err => logger.error(`Initial labels load failed: ${err.message}`));

module.exports = {
  getAvailableLabels,
  getLabelValues,
  detectHostLabel,
  detectFilenameLabel,
  detectJobLabel,
  getLokiCapabilities,
  getRecentLogs,
  searchLogs,
  getLogsByHost,
  getLogsByLabel,
  getLokiStats,
  checkLokiConnection,
  lokiClient
};
